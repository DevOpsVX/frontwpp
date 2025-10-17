import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { Plus, Power, Trash2, Copy, Check, RefreshCw, Link2, QrCode as QrCodeIcon, AlertCircle, X } from 'lucide-react';
import logoVolxo from './logo-volxo.png';
import { API_BASE_URL, WS_BASE_URL, API_ENDPOINTS, apiRequest, createWebSocket } from './config/api';

// ========================================
// CONFIGURAÇÃO OAUTH GHL
// ========================================

const DEFAULT_GHL_OAUTH_CONFIG = {
  clientId: '681fa839d9607f808d245978-mqukpyog',
  redirectUri: 'https://volxowppconect.onrender.com/leadconnectorhq/oauth/callback',
  authUrl: 'https://marketplace.gohighlevel.com/oauth/chooselocation'

};

const GHL_OAUTH_CONFIG = {
  clientId: import.meta.env.VITE_GHL_CLIENT_ID || DEFAULT_GHL_OAUTH_CONFIG.clientId,
  redirectUri: import.meta.env.VITE_GHL_REDIRECT_URI || DEFAULT_GHL_OAUTH_CONFIG.redirectUri,
  authUrl: import.meta.env.VITE_GHL_AUTH_URL || DEFAULT_GHL_OAUTH_CONFIG.authUrl
};

// ========================================
// COMPONENTE: MODAL DE CRIAR INSTÂNCIA
// ========================================
const CreateInstanceModal = ({ isOpen, onClose, onCreateInstance }) => {
  const [instanceName, setInstanceName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInstanceName('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen]);

  const validateInstanceName = (name) => {
    // Apenas letras minúsculas, números e hífens
    const regex = /^[a-z0-9-]+$/;
    return regex.test(name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!instanceName.trim()) {
      setError('O nome da instância é obrigatório');
      return;
    }

    if (!validateInstanceName(instanceName)) {
      setError('Use apenas letras minúsculas, números e hífens (-)');
      return;
    }

    if (instanceName.length < 3) {
      setError('O nome deve ter no mínimo 3 caracteres');
      return;
    }

    if (instanceName.length > 50) {
      setError('O nome deve ter no máximo 50 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      await onCreateInstance(instanceName);
    } catch (err) {
      setError(err.message || 'Erro ao criar instância');
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setInstanceName(value);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in">
      <div className="bg-bg-card border border-primary/30 rounded-2xl p-8 max-w-md w-full neon-glow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary neon-text">Nova Instância</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-bold text-white mb-2">
              Nome da Instância *
            </label>
            <input
              type="text"
              value={instanceName}
              onChange={handleInputChange}
              placeholder="exemplo: minha-instancia-01"
              className="input-field w-full"
              autoFocus
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-2">
              Apenas letras minúsculas, números e hífens (-)
            </p>
            {error && (
              <div className="flex items-center gap-2 mt-3 text-red-400 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Processando...' : 'Continuar para Login GHL'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ========================================
// COMPONENTE: DASHBOARD (HOME)
// ========================================
const Dashboard = () => {
  const [instances, setInstances] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Carregar instâncias ao montar o componente
  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    setIsLoading(true);
    try {
      // Tentar carregar do backend (Supabase)
      const data = await apiRequest(API_ENDPOINTS.INSTALLATIONS);
      
      // Mapear dados do Supabase para o formato do frontend
      const mappedInstances = data.map(item => ({
        id: item.location_id,
        name: item.location_id, // Usar location_id como nome
        status: item.access_token ? 'connected' : 'pending',
        createdAt: item.updated_at || new Date().toISOString(),
        phone: item.phone_number || null
      }));
      
      setInstances(mappedInstances);
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
      
      // Fallback: carregar do localStorage
      const stored = localStorage.getItem('volxo_whatsapp_instances');
      if (stored) {
        setInstances(JSON.parse(stored));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInstance = async (name) => {
    try {
      // Verificar se já existe
      const exists = instances.some(inst => inst.name === name);
      if (exists) {
        throw new Error('Já existe uma instância com este nome');
      }

      // Salvar nome temporariamente no localStorage para usar após OAuth
      localStorage.setItem('volxo_pending_instance_name', name);

      if (!GHL_OAUTH_CONFIG.clientId) {
        throw new Error(
          'Client ID do GoHighLevel não está configurado. Defina VITE_GHL_CLIENT_ID ou ajuste o fallback em DEFAULT_GHL_OAUTH_CONFIG.'

        );
      }

      // Construir URL de autorização OAuth do GoHighLevel
      const state = btoa(JSON.stringify({ instanceName: name, timestamp: Date.now() }));
      const oauthUrl = `${GHL_OAUTH_CONFIG.authUrl}?client_id=${GHL_OAUTH_CONFIG.clientId}&redirect_uri=${encodeURIComponent(GHL_OAUTH_CONFIG.redirectUri)}&response_type=code&state=${state}`;

      // Redirecionar para OAuth do GHL
      window.location.href =oauthUrl;

    } catch (error) {
      throw error;
    }
  };

  const handleDeleteInstance = async (instanceId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta instância?')) {
      return;
    }

    try {
      // Tentar deletar no backend
      try {
        await apiRequest(API_ENDPOINTS.DELETE_INSTANCE(instanceId), {
          method: 'DELETE'
        });
      } catch (apiError) {
        console.warn('Backend não disponível:', apiError);
      }

      // Remover da lista local
      const updatedInstances = instances.filter(inst => inst.id !== instanceId);
      setInstances(updatedInstances);
      localStorage.setItem('volxo_whatsapp_instances', JSON.stringify(updatedInstances));
      
    } catch (error) {
      console.error('Erro ao excluir instância:', error);
      alert('Erro ao excluir instância');
    }
  };

  const handleRestartInstance = async (instanceId) => {
    try {
      await apiRequest(API_ENDPOINTS.RESTART_WHATSAPP(instanceId), {
        method: 'POST'
      });
      alert('Instância reiniciada com sucesso!');
      loadInstances();
    } catch (error) {
      console.error('Erro ao reiniciar instância:', error);
      alert('Erro ao reiniciar instância. Funcionalidade ainda não implementada no backend.');
    }
  };

  const filteredInstances = instances.filter(inst =>
    inst.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeInstances = instances.filter(inst => inst.status === 'connected').length;

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
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Nova Instância
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search and Stats */}
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
              <span className="text-2xl font-bold text-green-400">{activeInstances}</span>
            </div>
          </div>
        </div>

        {/* Instances Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="animate-spin text-primary mx-auto mb-4" size={48} />
              <p className="text-gray-400">Carregando instâncias...</p>
            </div>
          </div>
        ) : filteredInstances.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block p-8 rounded-full bg-primary/10 mb-6">
              <Plus size={64} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Nenhuma instância criada</h2>
            <p className="text-gray-400 mb-8">Comece criando sua primeira instância WhatsApp</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Criar Primeira Instância
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInstances.map((instance) => (
              <div key={instance.id} className="instance-card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{instance.name}</h3>
                    <p className="text-xs text-gray-500">{instance.id}</p>
                    {instance.phone && (
                      <p className="text-sm text-gray-400 mt-1">📱 {instance.phone}</p>
                    )}
                  </div>
                  <span className={`status-badge ${instance.status === 'connected' ? 'status-connected' : 'status-pending'}`}>
                    {instance.status === 'connected' ? 'Conectado' : 'Pendente'}
                  </span>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => navigate(`/qrcode/${instance.id}`)}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <QrCodeIcon size={16} />
                    Conectar
                  </button>
                  <button
                    onClick={() => handleRestartInstance(instance.id)}
                    className="btn-icon"
                    title="Reiniciar"
                  >
                    <RefreshCw size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteInstance(instance.id)}
                    className="btn-icon-danger"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      <CreateInstanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateInstance={handleCreateInstance}
      />
    </div>
  );
};

// ========================================
// COMPONENTE: PÁGINA DE QR CODE
// ========================================
const QRCodePage = () => {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState('');
  const [status, setStatus] = useState('waiting'); // waiting, generating, connected, expired
  const [phoneNumber, setPhoneNumber] = useState('');
  const [progress, setProgress] = useState(100);
  const [copied, setCopied] = useState(false);
  const [connectionLink, setConnectionLink] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    // Gerar link de conexão
    const link = `${window.location.origin}/qrcode/${instanceId}`;
    setConnectionLink(link);

    // Conectar WebSocket (quando implementado no backend)
    try {
      wsRef.current = createWebSocket(instanceId, {
        onOpen: () => {
          console.log('WebSocket conectado');
        },
        onQR: (qrData) => {
          setQrCode(qrData);
          setStatus('generating');
          startTimer();
        },
        onStatus: (message) => {
          if (message.toLowerCase().includes('conectado') || message.toLowerCase().includes('pronto')) {
            setStatus('connected');
          }
        },
        onPhone: (number) => {
          setPhoneNumber(number);
          setStatus('connected');
          handleConnectionSuccess(number);
        },
        onError: (error) => {
          console.error('Erro no WebSocket:', error);
        },
        onClose: () => {
          console.log('WebSocket desconectado');
        }
      });
    } catch (error) {
      console.warn('WebSocket não disponível:', error);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, [instanceId]);

  const handleConnectionSuccess = (phone) => {
    setShowSuccessModal(true);
    
    // Redirecionar após 3 segundos
    redirectTimerRef.current = setTimeout(() => {
      navigate('/');
    }, 3000);
  };

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setProgress(100);
    const duration = 45000; // 45 segundos
    const interval = 100;
    const decrement = (interval / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - decrement;
        if (newProgress <= 0) {
          clearInterval(timerRef.current);
          setStatus('expired');
          return 0;
        }
        return newProgress;
      });
    }, interval);
  };

  const handleStartConnection = async () => {
    try {
      setStatus('generating');
      
      // Fazer requisição para iniciar conexão
      const response = await apiRequest(API_ENDPOINTS.CONNECT_WHATSAPP, {
        method: 'POST',
        body: JSON.stringify({ locationId: instanceId })
      });

      console.log('Resposta do backend:', response);

      // Se WebSocket não estiver disponível, simular QR Code
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        // Gerar QR Code simulado para demonstração
        const simulatedQR = `whatsapp://connect/${instanceId}/${Date.now()}`;
        setQrCode(simulatedQR);
        startTimer();
      }

    } catch (error) {
      console.error('Erro ao iniciar conexão:', error);
      alert('Erro ao iniciar conexão. Verifique se o backend está rodando.');
      setStatus('waiting');
    }
  };

  const handleRegenerateQR = () => {
    setQrCode('');
    setProgress(100);
    setStatus('waiting');
    handleStartConnection();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(connectionLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getProgressColor = () => {
    if (progress > 66) return 'bg-primary';
    if (progress > 33) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const getProgressShadow = () => {
    if (progress > 66) return 'shadow-[0_0_10px_rgba(0,255,255,0.5)]';
    if (progress > 33) return 'shadow-[0_0_10px_rgba(250,204,21,0.5)]';
    return 'shadow-[0_0_10px_rgba(248,113,113,0.5)]';
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
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Status Card */}
          <div className="instance-card text-center">
            {status === 'waiting' && (
              <>
                <div className="inline-block p-8 rounded-full bg-primary/10 mb-6">
                  <QrCodeIcon size={64} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Pronto para Conectar</h2>
                <p className="text-gray-400 mb-8">
                  Clique no botão abaixo para gerar o QR Code e conectar sua conta WhatsApp
                </p>
                <button
                  onClick={handleStartConnection}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Power size={20} />
                  Iniciar Conexão e Gerar QR Code
                </button>
              </>
            )}

            {status === 'generating' && qrCode && (
              <>
                <h2 className="text-2xl font-bold text-white mb-6">Escaneie o QR Code</h2>
                
                {/* QR Code */}
                <div className="bg-white p-6 rounded-2xl inline-block mb-6">
                  <QRCode value={qrCode} size={256} />
                </div>

                {/* Progress Bar */}
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

                <p className="text-gray-400 text-sm">
                  Abra o WhatsApp no seu celular e escaneie este código
                </p>
              </>
            )}

            {status === 'expired' && (
              <>
                <div className="inline-block p-8 rounded-full bg-red-500/10 mb-6">
                  <AlertCircle size={64} className="text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">QR Code Expirado</h2>
                <p className="text-gray-400 mb-8">
                  O tempo limite foi atingido. Clique no botão abaixo para gerar um novo código
                </p>
                <button
                  onClick={handleRegenerateQR}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <RefreshCw size={20} />
                  Regenerar QR Code
                </button>
              </>
            )}

            {status === 'connected' && !showSuccessModal && (
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
                <button
                  onClick={() => navigate('/')}
                  className="btn-primary"
                >
                  Voltar ao Dashboard
                </button>
              </>
            )}
          </div>

          {/* Connection Link */}
          {status !== 'connected' && (
            <div className="mt-8 instance-card">
              <div className="flex items-center gap-3 mb-4">
                <Link2 className="text-primary" size={24} />
                <h3 className="text-lg font-bold text-white">Link de Conexão</h3>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Compartilhe este link com seu cliente para que ele possa conectar o WhatsApp dele
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={connectionLink}
                  readOnly
                  className="input-field flex-1"
                />
                <button
                  onClick={handleCopyLink}
                  className="btn-primary flex items-center gap-2"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? 'Copiado!' : 'Copiar'}
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
            <p className="text-gray-400 mb-8">
              Redirecionando para o dashboard...
            </p>
            <div className="flex gap-2 justify-center">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ========================================
// COMPONENTE: APP PRINCIPAL
// ========================================
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/qrcode/:instanceId" element={<QRCodePage />} />
      </Routes>
    </Router>
  );
}

export default App;

