// src/App.jsx
import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { Plus, RefreshCw, Trash2, QrCode as QrCodeIcon } from "lucide-react";
import logoVolxo from "./logo-volxo.png";
import { API_BASE_URL, WS_BASE_URL, API_ENDPOINTS, apiRequest, createWebSocket } from "./config/api";
import ConnectWhatsApp from "./ConnectWhatsApp";

// ===== Config OAuth (usa envs de build do front) =====
const GHL_OAUTH_CONFIG = {
  clientId: import.meta.env.VITE_GHL_CLIENT_ID || "",
  redirectUri:
    import.meta.env.VITE_GHL_REDIRECT_URI ||
    "https://volxowppconect.onrender.com/leadconnectorhq/oauth/callback",
  authUrl:
    import.meta.env.VITE_GHL_AUTH_URL ||
    "https://marketplace.gohighlevel.com/oauth/chooselocation",
};

// ===== Modal simples p/ criar instância (mesma UI) =====
const CreateInstanceModal = ({ isOpen, onClose, onCreateInstance }) => {
  const [instanceName, setInstanceName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInstanceName("");
      setError("");
      setLoading(false);
    }
  }, [isOpen]);

  const validate = (name) => /^[a-z0-9-]{3,50}$/.test(name);

  async function submit(e) {
    e.preventDefault();
    if (!instanceName.trim()) return setError("O nome da instância é obrigatório");
    if (!validate(instanceName)) return setError("Use minúsculas, números e hífen (3-50)");
    setLoading(true);
    try {
      await onCreateInstance(instanceName);
    } catch (err) {
      setError(err.message || "Erro ao criar instância");
      setLoading(false);
    }
  }

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card border border-primary/30 rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-primary mb-6">Nova Instância</h2>
        <form onSubmit={submit}>
          <input
            className="input-field w-full mb-2"
            placeholder="ex: minha-instancia-01"
            value={instanceName}
            onChange={(e) => {
              setInstanceName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              setError("");
            }}
          />
          {!!error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <div className="flex gap-3">
            <button type="button" className="btn-secondary flex-1" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button className="btn-primary flex-1" disabled={loading}>
              {loading ? "Processando..." : "Continuar para Login GHL"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ===== Dashboard =====
const Dashboard = () => {
  const [instances, setInstances] = useState([]);
  const [term, setTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiRequest(API_ENDPOINTS.INSTALLATIONS);
      const mapped = (data || []).map((r) => ({
        id: r.instance_name,
        name: r.instance_name,
        status: r.access_token ? "connected" : "pending",
        createdAt: r.updated_at,
        phone: r.phone_number || null,
      }));
      setInstances(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function onCreateInstance(name) {
    // cria a linha no supabase
    await apiRequest(API_ENDPOINTS.CREATE_INSTANCE, {
      method: "POST",
      body: JSON.stringify({ name }),
    });

    // guarda nome para callback
    localStorage.setItem("volxo_pending_instance_name", name);

    // inicia oauth ghl
    const state = btoa(JSON.stringify({ instanceName: name, t: Date.now() }));
    const scopes = [
      "conversations.readonly",
      "conversations.write",
      "conversations/message.readonly",
      "conversations/message.write",
      "contacts.readonly",
      "contacts.write",
      "locations.readonly",
      "locations.write",
      "oauth.readonly",
      "oauth.write"
    ].join(" ");

    const url =
      `${GHL_OAUTH_CONFIG.authUrl}` +
      `?client_id=${encodeURIComponent(GHL_OAUTH_CONFIG.clientId)}` +
      `&redirect_uri=${encodeURIComponent(GHL_OAUTH_CONFIG.redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${encodeURIComponent(state)}`;

    window.location.href = url;
  }

  async function del(id) {
    if (!confirm("Excluir esta instância?")) return;
    try {
      await apiRequest(API_ENDPOINTS.DELETE_INSTANCE(id), { method: "DELETE" });
      setInstances((lst) => lst.filter((i) => i.id !== id));
    } catch (e) {
      alert("Erro ao excluir instância");
    }
  }

  const filtered = instances.filter((i) =>
    (i.name || i.id || "").toLowerCase().includes(term.toLowerCase())
  );

  const active = instances.filter((i) => i.status === "connected").length;

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-gray-800 bg-bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoVolxo} alt="Volxo" className="h-12 w-12" />
            <div>
              <h1 className="text-3xl font-bold text-primary">Volxo</h1>
              <p className="text-sm text-gray-400">Gerenciador de Instâncias WhatsApp</p>
            </div>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => setModalOpen(true)}>
            <Plus size={18} /> Nova Instância
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <input
            className="input-field flex-1"
            placeholder="Pesquisar instâncias..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <div className="flex gap-4">
            <div className="stat-card">
              <span className="text-gray-400">Total:</span>
              <span className="text-2xl font-bold text-primary">{instances.length}</span>
            </div>
            <div className="stat-card">
              <span className="text-gray-400">Ativas:</span>
              <span className="text-2xl font-bold text-green-400">{active}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="animate-spin text-primary mx-auto mb-4" size={48} />
              <p className="text-gray-400">Carregando instâncias...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block p-8 rounded-full bg-primary/10 mb-6">
              <Plus size={64} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Nenhuma instância criada</h2>
            <button className="btn-primary inline-flex items-center gap-2" onClick={() => setModalOpen(true)}>
              <Plus size={18} /> Criar Primeira Instância
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((inst) => (
              <div key={inst.id} className="instance-card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{inst.name}</h3>
                    <p className="text-xs text-gray-500">{inst.id}</p>
                    {inst.phone && <p className="text-sm text-gray-400 mt-1">📱 {inst.phone}</p>}
                  </div>
                  <span className={`status-badge ${inst.status === "connected" ? "status-connected" : "status-pending"}`}>
                    {inst.status === "connected" ? "Conectado" : "Pendente"}
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="btn-primary flex-1 flex items-center justify-center gap-2"
                          onClick={() => navigate(`/connect/${inst.id}`)}>
                    <QrCodeIcon size={16} /> Conectar
                  </button>
                  <button className="btn-icon-danger" onClick={() => del(inst.id)} title="Excluir">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <CreateInstanceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreateInstance={onCreateInstance}
      />
    </div>
  );
};

// ===== Rotas =====
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/connect/:instanceId" element={<ConnectWhatsApp />} />
      </Routes>
    </Router>
  );
}

export default App;
