import { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from "react-router-dom";
import QRCode from "react-qr-code";
import { Plus, Power, Trash2, Copy, Check, RefreshCw, Link2, QrCode as QrCodeIcon, AlertCircle, X } from "lucide-react";
import logoVolxo from "./logo-volxo.png";
import { API_ENDPOINTS, apiRequest, createWebSocket } from "./config/api";
import ConnectWhatsApp from "./ConnectWhatsApp";

// ========================================
// OAUTH GHL
// ========================================
const GHL_OAUTH_CONFIG = {
  clientId: import.meta.env.VITE_GHL_CLIENT_ID || "68f1fa89d9f07703ad254978-mgukpyog",
  redirectUri:
    import.meta.env.VITE_GHL_REDIRECT_URI ||
    "https://volxowppconect.onrender.com/leadconnectorhq/oauth/callback",
  authUrl:
    import.meta.env.VITE_GHL_AUTH_URL ||
    "https://marketplace.gohighlevel.com/oauth/chooselocation",
};

// ========================================
// MODAL: CRIAR INSTÂNCIA
// ========================================
const CreateInstanceModal = ({ isOpen, onClose, onCreateInstance }) => {
  const [instanceName, setInstanceName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInstanceName("");
      setError("");
      setIsLoading(false);
    }
  }, [isOpen]);

  const valid = (s) => /^[a-z0-9-]+$/.test(s);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!instanceName) return setError("O nome da instância é obrigatório");
    if (!valid(instanceName)) return setError("Use apenas letras minúsculas, números e hífens");
    if (instanceName.length < 3) return setError("Mínimo 3 caracteres");
    if (instanceName.length > 50) return setError("Máximo 50 caracteres");
    setIsLoading(true);
    try {
      await onCreateInstance(instanceName);
    } catch (err) {
      setError(err.message || "Erro ao criar instância");
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card border border-primary/30 rounded-2xl p-8 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary">Nova Instância</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2" disabled={isLoading}>
            <X size={22} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-bold text-white mb-2">Nome da Instância *</label>
          <input
            type="text"
            value={instanceName}
            onChange={(e) => {
              setError("");
              setInstanceName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            placeholder="minha-instancia-01"
            className="input-field w-full mb-2"
            autoFocus
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mb-4">Apenas letras minúsculas, números e hífens (-)</p>
          {error && (
            <div className="flex items-center gap-2 mb-4 text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={isLoading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={isLoading}>
              {isLoading ? "Processando..." : "Continuar para Login GHL"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ========================================
// DASHBOARD
// ========================================
const Dashboard = () => {
  const [instances, setInstances] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoading(true);
    try {
      const data = await apiRequest(API_ENDPOINTS.INSTALLATIONS);
      const mapped = (data || []).map((row) => ({
        id: row.instance_name,
        name: row.instance_name,
        locationId: row.instance_id || null,
        status: row.access_token ? "connected" : "pending",
        createdAt: row.updated_at || new Date().toISOString(),
        phone: row.phone_number || null,
      }));
      setInstances(mapped);
      localStorage.setItem("volxo_whatsapp_instances", JSON.stringify(mapped));
    } catch (e) {
      console.error(e);
      const stored = localStorage.getItem("volxo_whatsapp_instances");
      if (stored) setInstances(JSON.parse(stored));
    } finally {
      setIsLoading(false);
    }
  }

  const handleCreateInstance = async (name) => {
    if (instances.some((i) => i.name === name)) {
      throw new Error("Já existe uma instância com este nome");
    }
    // cria no backend
    await apiRequest(API_ENDPOINTS.CREATE_INSTANCE, {
      method: "POST",
      body: JSON.stringify({ name }),
    });

    // salva o slug para o callback
    localStorage.setItem("volxo_pending_instance_name", name);

    const state = btoa(JSON.stringify({ instanceName: name, ts: Date.now() }));

    // ✅ SCOPES válidos (mesmo painel do GHL)
    const scopes = [
      "oauth.readonly",
      "oauth.write",
      "locations.readonly",
      "locations.write",
      "contacts.readonly",
      "contacts.write",
      "conversations.readonly",
      "conversations.write",
      "conversations/message.readonly",
      "conversations/message.write",
    ].join(" ");

    const oauthUrl = `${GHL_OAUTH_CONFIG.authUrl}?client_id=${GHL_OAUTH_CONFIG.clientId}&redirect_uri=${encodeURIComponent(
      GHL_OAUTH_CONFIG.redirectUri
    )}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}`;

    window.location.href = oauthUrl;
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir esta instância?")) return;
    await apiRequest(API_ENDPOINTS.DELETE_INSTANCE(id), { method: "DELETE" });
    setInstances((prev) => prev.filter((i) => i.id !== id));
  };

  const handleRestart = async (id) => {
    await apiRequest(API_ENDPOINTS.RESTART_WHATSAPP(id), { method: "POST" });
    alert("Instância reiniciada!");
    load();
  };

  const filtered = instances.filter((i) =>
    (i.name || i.id).toLowerCase().includes(searchTerm.toLowerCase())
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
          <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus size={20} /> Nova Instância
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <input
            className="input-field flex-1"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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

        {isLoading ? (
          <div className="text-center py-20">
            <RefreshCw className="animate-spin text-primary mx-auto mb-4" size={48} />
            <p className="text-gray-400">Carregando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block p-8 rounded-full bg-primary/10 mb-6">
              <Plus size={64} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Nenhuma instância</h2>
            <button onClick={() => setIsModalOpen(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus size={20} /> Criar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((inst) => (
              <div key={inst.id} className="instance-card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{inst.name}</h3>
                    {inst.locationId && <p className="text-xs text-gray-500">locationId: {inst.locationId}</p>}
                    {inst.phone && <p className="text-sm text-gray-400 mt-1">📱 {inst.phone}</p>}
                  </div>
                  <span className={`status-badge ${inst.status === "connected" ? "status-connected" : "status-pending"}`}>
                    {inst.status === "connected" ? "Conectado" : "Pendente"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/qrcode/${inst.id}`)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <QrCodeIcon size={16} /> Conectar
                  </button>
                  <button onClick={() => handleRestart(inst.id)} className="btn-icon" title="Reiniciar">
                    <RefreshCw size={18} />
                  </button>
                  <button onClick={() => handleDelete(inst.id)} className="btn-icon-danger" title="Excluir">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <CreateInstanceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreateInstance={handleCreateInstance} />
    </div>
  );
};

// ========================================
// PÁGINA: QR CODE
// ========================================
const QRCodePage = () => {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState("");
  const [status, setStatus] = useState("waiting");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [progress, setProgress] = useState(100);
  const [copied, setCopied] = useState(false);
  const [connectionLink, setConnectionLink] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    const link = `${window.location.origin}/qrcode/${instanceId}`;
    setConnectionLink(link);

    try {
      wsRef.current = createWebSocket(instanceId, {
        onOpen: () => console.log("WS conectado"),
        onQR: (data) => {
          setQrCode(data);
          setStatus("generating");
          startTimer();
        },
        onStatus: (msg) => {
          const m = (msg || "").toLowerCase();
          if (m.includes("ready") || m.includes("pronto") || m.includes("conectado")) {
            setStatus("connected");
          }
        },
        onPhone: (number) => {
          setPhoneNumber(number);
          setStatus("connected");
          handleSuccess();
        },
        onError: (e) => console.error("WS error:", e),
        onClose: () => console.log("WS fechado"),
      });
    } catch (e) {
      console.warn("WS indisponível:", e);
    }

    return () => {
      wsRef.current?.close();
      if (timerRef.current) clearInterval(timerRef.current);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [instanceId]);

  function handleSuccess() {
    setShowSuccessModal(true);
    redirectTimerRef.current = setTimeout(() => navigate("/"), 3000);
  }

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);
    const duration = 45000;
    const interval = 100;
    const dec = (interval / duration) * 100;
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        const n = p - dec;
        if (n <= 0) {
          clearInterval(timerRef.current);
          setStatus("expired");
          return 0;
        }
        return n;
      });
    }, interval);
  }

  async function handleStart() {
    try {
      setStatus("generating");
      await apiRequest(API_ENDPOINTS.CONNECT_WHATSAPP, {
        method: "POST",
        body: JSON.stringify({ instanceId }),
      });

      // fallback se WS não aberto
      if (!wsRef.current || wsRef.current.readyState !== 1) {
        const fake = `whatsapp://connect/${instanceId}/${Date.now()}`;
        setQrCode(fake);
        startTimer();
      }
    } catch (e) {
      console.error("Erro ao iniciar:", e);
      alert("Erro ao iniciar conexão. Verifique o backend.");
      setStatus("waiting");
    }
  }

  const handleRegenerate = () => {
    setQrCode("");
    setProgress(100);
    setStatus("waiting");
    handleStart();
  };

  const getProgressColor = () =>
    progress > 66 ? "bg-primary" : progress > 33 ? "bg-yellow-400" : "bg-red-400";

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-gray-800 bg-bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoVolxo} alt="Volxo Logo" className="h-12 w-12" />
            <div>
              <h1 className="text-2xl font-bold text-primary">Conexão WhatsApp</h1>
              <p className="text-sm text-gray-400">Instância: {instanceId}</p>
            </div>
          </div>
          <button onClick={() => navigate("/")} className="btn-secondary">Voltar</button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="instance-card text-center">
            {status === "waiting" && (
              <>
                <div className="inline-block p-8 rounded-full bg-primary/10 mb-6">
                  <QrCodeIcon size={64} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Pronto para Conectar</h2>
                <p className="text-gray-400 mb-8">Clique para gerar o QR Code</p>
                <button onClick={handleStart} className="btn-primary inline-flex items-center gap-2">
                  <Power size={20} /> Iniciar Conexão e Gerar QR Code
                </button>
              </>
            )}

            {status === "generating" && qrCode && (
              <>
                <h2 className="text-2xl font-bold text-white mb-6">Escaneie o QR Code</h2>
                <div className="bg-white p-6 rounded-2xl inline-block mb-6">
                  <QRCode value={qrCode} size={256} />
                </div>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Tempo restante</span>
                    <span className="text-sm font-bold text-white">{Math.ceil((progress / 100) * 45)}s</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-100 ${getProgressColor()}`} style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <p className="text-gray-400 text-sm">Abra o WhatsApp e escaneie o código</p>
              </>
            )}

            {status === "expired" && (
              <>
                <div className="inline-block p-8 rounded-full bg-red-500/10 mb-6">
                  <AlertCircle size={64} className="text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">QR Code Expirado</h2>
                <button onClick={handleRegenerate} className="btn-primary inline-flex items-center gap-2">
                  <RefreshCw size={20} /> Regenerar
                </button>
              </>
            )}

            {status === "connected" && !showSuccessModal && (
              <>
                <div className="inline-block p-8 rounded-full bg-green-500/10 mb-6">
                  <Check size={64} className="text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-green-400 mb-4">Conectado com Sucesso!</h2>
                {phoneNumber && (
                  <p className="text-gray-400 mb-8">
                    Número: <span className="text-white font-bold">{phoneNumber}</span>
                  </p>
                )}
                <button onClick={() => navigate("/")} className="btn-primary">
                  Voltar ao Dashboard
                </button>
              </>
            )}
          </div>

          {status !== "connected" && (
            <div className="mt-8 instance-card">
              <div className="flex items-center gap-3 mb-4">
                <Link2 className="text-primary" size={24} />
                <h3 className="text-lg font-bold text-white">Link de Conexão</h3>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Envie este link para o cliente conectar (apenas a tela de escanear).
              </p>
              <div className="flex gap-2">
                <input type="text" value={connectionLink} readOnly className="input-field flex-1" />
                <button onClick={() => { navigator.clipboard.writeText(connectionLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="btn-primary flex items-center gap-2">
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-green-400/30 rounded-2xl p-12 max-w-md w-full text-center">
            <div className="inline-block p-8 rounded-full bg-green-500/20 mb-6 animate-pulse">
              <Check size={80} className="text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-green-400 mb-4">WhatsApp Conectado!</h2>
            {phoneNumber && (
              <p className="text-gray-300 text-lg mb-6">
                Número: <span className="text-white font-bold">{phoneNumber}</span>
              </p>
            )}
            <p className="text-gray-400 mb-8">Redirecionando para o dashboard...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ========================================
// APP
// ========================================
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/qrcode/:instanceId" element={<QRCodePage />} />
        <Route path="/connect/:instanceId" element={<ConnectWhatsApp />} />
      </Routes>
    </Router>
  );
}
export default App;
