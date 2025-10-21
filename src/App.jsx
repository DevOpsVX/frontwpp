// App.jsx
import { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from "react-router-dom";
import QRCode from "react-qr-code";
import { Plus, Power, Trash2, Copy, Check, RefreshCw, Link2, QrCode as QrCodeIcon, AlertCircle, X } from "lucide-react";
import logoVolxo from "./logo-volxo.png";
import { API_BASE_URL, WS_BASE_URL, API_ENDPOINTS, apiRequest, createWebSocket } from "./config/api";
import ConnectWhatsApp from "./ConnectWhatsApp";

// ========================================
// CONFIGURAÇÃO OAUTH GHL
// ========================================
const GHL_OAUTH_CONFIG = {
  clientId: "68f1fa89d9f07703ad254978-mgukpyog", // seu Client ID
  redirectUri: "https://volxowppconect.onrender.com/leadconnectorhq/oauth/callback",
  authUrl: "https://marketplace.gohighlevel.com/oauth/chooselocation",
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

  const validateInstanceName = (name) => /^[a-z0-9-]+$/.test(name);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!instanceName.trim()) return setError("O nome da instância é obrigatório");
    if (!validateInstanceName(instanceName)) return setError("Use apenas letras minúsculas, números e hífens (-)");
    if (instanceName.length < 3) return setError("O nome deve ter no mínimo 3 caracteres");
    if (instanceName.length > 50) return setError("O nome deve ter no máximo 50 caracteres");

    setIsLoading(true);
    try {
      await onCreateInstance(instanceName);
    } catch (err) {
      setError(err.message || "Erro ao criar instância");
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setInstanceName(value);
    setError("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in">
      <div className="bg-bg-card border border-primary/30 rounded-2xl p-8 max-w-md w-full neon-glow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary neon-text">Nova Instância</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg" disabled={isLoading}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-bold text-white mb-2">Nome da Instância *</label>
            <input
              type="text"
              value={instanceName}
              onChange={handleInputChange}
              placeholder="exemplo: minha-instancia-01"
              className="input-field w-full"
              autoFocus
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-2">Apenas letras minúsculas, números e hífens (-)</p>
            {error && (
              <div className="flex items-center gap-2 mt-3 text-red-400 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>

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
    loadInstances();
  }, []);

  const loadInstances = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest(API_ENDPOINTS.INSTALLATIONS);

      // Mapeia para o formato da UI
      const mapped = (data || []).map((item) => ({
        id: item.instance_name,                      // sempre o slug
        name: item.instance_name,
        locationId: item.instance_id || null,        // locationId do GHL (apenas informativo)
        status: item.access_token ? "connected" : "pending",
        createdAt: item.updated_at || new Date().toISOString(),
        phone: item.phone_number || null,
      }));

      setInstances(mapped);
      localStorage.setItem("volxo_whatsapp_instances", JSON.stringify(mapped));
    } catch (error) {
      console.error("Erro ao carregar instâncias:", error);
      // fallback local
      const stored = localStorage.getItem("volxo_whatsapp_instances");
      if (stored) setInstances(JSON.parse(stored));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInstance = async (name) => {
    // Evita duplicado
    if (instances.some((i) => i.name === name)) {
      throw new Error("Já existe uma instância com este nome");
    }

    // salva para usar após OAuth (caso necessário)
    localStorage.setItem("volxo_pending_instance_name", name);

    // Gera state e scopes
    const state = btoa(JSON.stringify({ instanceName: name, ts: Date.now() }));
    const scopes = [
      "oauth.write",
      "oauth.readonly",
      "locations.readonly",
      "locations.write",
      "contacts.readonly",
      "contacts.write",
      "conversations.readonly",
      "conversations.write",
      "conversations/message.readonly",
      "conversations/message.write",
      "numberpools.read",
      "phonennumbers.read"
    ].join(" ");

    const oauthUrl = `${GHL_OAUTH_CONFIG.authUrl}?client_id=${GHL_OAUTH_CONFIG.clientId}&redirect_uri=${encodeURIComponent(
      GHL_OAUTH_CONFIG.redirectUri
    )}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}`;

    window.location.href = oauthUrl;
  };

  const handleDeleteInstance = async (instanceId) => {
    if (!window.confirm("Tem certeza que deseja excluir esta instância?")) return;

    try {
      await apiRequest(API_ENDPOINTS.DELETE_INSTANCE(instanceId), { method: "DELETE" });
      const updated = instances.filter((i) => i.id !== instanceId);
      setInstances(updated);
      localStorage.setItem("volxo_whatsapp_instances", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
      alert("Erro ao excluir instância.");
    }
  };

  const handleRestartInstance = async (instanceId) => {
    try {
      await apiRequest(API_ENDPOINTS.RESTART_WHATSAPP(instanceId), { method: "POST" });
      alert("Instância reiniciada com sucesso!");
      loadInstances();
    } catch (e) {
      console.error(e);
      alert("Erro ao reiniciar instância.");
    }
  };

  const filtered = instances.filter((inst) =>
    (inst.name || inst.id || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const active = instances.filter((i) => i.status === "connected").length;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="border-b border-gray-800 bg-bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoVolxo} alt="Volxo Logo" className="h-12 w-12" />
            <div>
              <h1 className="text-3xl font-bold text-primary neon-text">Volxo</h1>
              <p className="text-sm text-gray-400">Gerenciador de Instâncias WhatsApp</p>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Nova Instância
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-8">
        {/* Search & Stats */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Pesquisar instâncias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field w-full"
            />
          </div>
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

        {/* Grid */}
        {isLoading ? (
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
            <p className="text-gray-400 mb-8">Comece criando sua primeira instância WhatsApp</p>
            <button onClick={() => setIsModalOpen(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus size={20} />
              Criar Primeira Instância
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((instance) => (
              <div key={instance.id} className="instance-card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{instance.name}</h3>
                    {/* Mostra locationId (info) */}
                    {instance.locationId && (
                      <p className="text-xs text-gray-500">locationId: {instance.locationId}</p>
                    )}
                    {instance.phone && <p className="text-sm text-gray-400 mt-1">📱 {instance.phone}</p>}
                  </div>
                  <span className={`status-badge ${instance.status === "connected" ? "status-connected" : "status-pending"}`}>
                    {instance.status === "connected" ? "Conectado" : "Pendente"}
                  </span>
                </div>

                <div className="flex gap-2 mt-4">
                  <button onClick={() => navigate(`/qrcode/${instance.id}`)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <QrCodeIcon size={16} />
                    Conectar
                  </button>
                  <button onClick={() => handleRestartInstance(instance.id)} className="btn-icon" title="Reiniciar">
                    <RefreshCw size={18} />
                  </button>
                  <button onClick={() => handleDeleteInstance(instance.id)} className="btn-icon-danger" title="Excluir">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      <CreateInstanceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreateInstance={handleCreateInstance} />
    </div>
  );
};

// ========================================
// PÁGINA: QR CODE
// ========================================
const QRCodePage = () => {
  const { instanceId } = useParams(); // <- slug
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState("");
  const [status, setStatus] = useState("waiting"); // waiting, generating, connected, expired
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

    // Conecta WS
    try {
      wsRef.current = createWebSocket(instanceId, {
        onOpen: () => console.log("WebSocket conectado"),
        onQR: (qrData) => {
          setQrCode(qrData);
          setStatus("generating");
          startTimer();
        },
        onStatus: (message) => {
          const msg = (message || "").toLowerCase();
          if (msg.includes("ready") || msg.includes("pronto") || msg.includes("conectado")) {
            setStatus("connected");
          }
        },
        onPhone: (number) => {
          setPhoneNumber(number);
          setStatus("connected");
          handleConnectionSuccess(number);
        },
        onError: (err) => console.error("Erro no WS:", err),
        onClose: () => console.log("WS desconectado"),
      });
    } catch (err) {
      console.warn("WS não disponível:", err);
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [instanceId]);

  const handleConnectionSuccess = () => {
    setShowSuccessModal(true);
    redirectTimerRef.current = setTimeout(() => navigate("/"), 3000);
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    setProgress(100);
    const duration = 45000; // 45s
    const interval = 100;
    const decrement = (interval / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev - decrement;
        if (next <= 0) {
          clearInterval(timerRef.current);
          setStatus("expired");
          return 0;
        }
        return next;
      });
    }, interval);
  };

  const handleStartConnection = async () => {
    try {
      setStatus("generating");
      // Inicia conexão no backend — ENVIA O SLUG como instanceId
      await apiRequest(API_ENDPOINTS.CONNECT_WHATSAPP, {
        method: "POST",
        body: JSON.stringify({ instanceId }), // <- CORRETO
      });

      // Se o WS ainda não conectou, mostramos um QR simulado (fallback)
      if (!wsRef.current || wsRef.current.readyState !== 1) {
        const simulatedQR = `whatsapp://connect/${instanceId}/${Date.now()}`;
        setQrCode(simulatedQR);
        startTimer();
      }
    } catch (error) {
      console.error("Erro ao iniciar conexão:", error);
      alert("Erro ao iniciar conexão. Verifique se o backend está rodando.");
      setStatus("waiting");
    }
  };

  const handleRegenerateQR = () => {
    setQrCode("");
    setProgress(100);
    setStatus("waiting");
    handleStartConnection();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(connectionLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getProgressColor = () => {
    if (progress > 66) return "bg-primary";
    if (progress > 33) return "bg-yellow-400";
    return "bg-red-400";
  };

  const getProgressShadow = () => {
    if (progress > 66) return "shadow-[0_0_10px_rgba(0,255,255,0.5)]";
    if (progress > 33) return "shadow-[0_0_10px_rgba(250,204,21,0.5)]";
    return "shadow-[0_0_10px_rgba(248,113,113,0.5)]";
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="border-b border-gray-800 bg-bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoVolxo} alt="Volxo Logo" className="h-12 w-12" />
            <div>
              <h1 className="text-2xl font-bold text-primary neon-text">Conexão WhatsApp</h1>
              <p className="text-sm text-gray-400">Instância: {instanceId}</p>
            </div>
          </div>
          <button onClick={() => navigate("/")} className="btn-secondary">
            Voltar ao Dashboard
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="instance-card text-center">
            {status === "waiting" && (
              <>
                <div className="inline-block p-8 rounded-full bg-primary/10 mb-6">
                  <QrCodeIcon size={64} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Pronto para Conectar</h2>
                <p className="text-gray-400 mb-8">Clique para gerar o QR Code e conectar seu WhatsApp</p>
                <button onClick={handleStartConnection} className="btn-primary inline-flex items-center gap-2">
                  <Power size={20} />
                  Iniciar Conexão e Gerar QR Code
                </button>
              </>
            )}

            {status === "generating" && qrCode && (
              <>
                <h2 className="text-2xl font-bold text-white mb-6">Escaneie o QR Code</h2>
                <div className="bg-white p-6 rounded-2xl inline-block mb-6">
                  <QRCode value={qrCode} size={256} />
                </div>

                {/* Progress */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Tempo restante</span>
                    <span className="text-sm font-bold text-white">{Math.ceil((progress / 100) * 45)}s</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-100 ${getProgressColor()} ${getProgressShadow()}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {progress < 33 && (
                    <p className="text-red-400 text-sm mt-2 flex items-center justify-center gap-2">
                      <AlertCircle size={16} />
                      QR Code expirando em breve!
                    </p>
                  )}
                </div>

                <p className="text-gray-400 text-sm">Abra o WhatsApp e escaneie este código</p>
              </>
            )}

            {status === "expired" && (
              <>
                <div className="inline-block p-8 rounded-full bg-red-500/10 mb-6">
                  <AlertCircle size={64} className="text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">QR Code Expirado</h2>
                <p className="text-gray-400 mb-8">Clique para gerar um novo código</p>
                <button onClick={handleRegenerateQR} className="btn-primary inline-flex items-center gap-2">
                  <RefreshCw size={20} />
                  Regenerar QR Code
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
                    Número conectado: <span className="text-white font-bold">{phoneNumber}</span>
                  </p>
                )}
                <button onClick={() => navigate("/")} className="btn-primary">
                  Voltar ao Dashboard
                </button>
              </>
            )}
          </div>

          {/* Link de conexão (white label) */}
          {status !== "connected" && (
            <div className="mt-8 instance-card">
              <div className="flex items-center gap-3 mb-4">
                <Link2 className="text-primary" size={24} />
                <h3 className="text-lg font-bold text-white">Link de Conexão</h3>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Envie este link para o cliente conectar o WhatsApp dele (acesso apenas à tela de escanear).
              </p>
              <div className="flex gap-2">
                <input type="text" value={connectionLink} readOnly className="input-field flex-1" />
                <button onClick={handleCopyLink} className="btn-primary flex items-center gap-2">
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in">
          <div className="bg-bg-card border border-green-400/30 rounded-2xl p-12 max-w-md w-full text-center neon-glow">
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
            <div className="flex gap-2 justify-center">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
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
