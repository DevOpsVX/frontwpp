import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { ArrowLeft, RefreshCw, Link as LinkIcon, X, Power, Trash2 } from 'lucide-react';
import logoVolxo from './logo-volxo.png';

export default function ConnectWhatsApp() {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  
  const [instanceData, setInstanceData] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(45);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Desconectado');
  const [wsConnection, setWsConnection] = useState(null);

  useEffect(() => {
    // Buscar dados da instância
    const mockData = {
      id: instanceId,
      name: instanceId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      reference: '1',
      status: 'disconnected',
      phoneNumber: null
    };
    setInstanceData(mockData);
  }, [instanceId]);

  useEffect(() => {
    if (showQRModal && timeLeft > 0 && qrCode) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && qrCode) {
      setConnectionStatus('QR Code expirado');
    }
  }, [showQRModal, timeLeft, qrCode]);

  const handleGenerateQR = async () => {
    setShowQRModal(true);
    setIsConnecting(true);
    setTimeLeft(45);
    setConnectionStatus('Gerando QR Code...');
    setQrCode('');

    try {
      // Conectar WebSocket
      const ws = new WebSocket(import.meta.env.VITE_WS_URL || 'wss://volxowppconect.onrender.com');
      
      ws.onopen = () => {
        console.log('WebSocket conectado');
        ws.send(JSON.stringify({
          type: 'register',
          instanceId: instanceId
        }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('Mensagem WebSocket:', message);
        
        if (message.type === 'qr') {
          setQrCode(message.data);
          setConnectionStatus('Aguardando leitura do QR Code...');
          setIsConnecting(false);
        } else if (message.type === 'status') {
          setConnectionStatus(message.message);
        } else if (message.type === 'phone') {
          setConnectionStatus(`Conectado: ${message.number}`);
          setTimeout(() => {
            setShowQRModal(false);
            navigate('/');
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('Erro WebSocket:', error);
        setConnectionStatus('Erro ao conectar WebSocket');
        setIsConnecting(false);
      };

      setWsConnection(ws);

      // Chamar API do backend para iniciar conexão
      const response = await fetch(`${import.meta.env.VITE_API_URL}/whatsapp/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: instanceId })
      });

      if (!response.ok) {
        throw new Error('Erro ao iniciar conexão');
      }

    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      setConnectionStatus('Erro ao gerar QR Code. Tente novamente.');
      setIsConnecting(false);
    }
  };

  const handleRefreshQR = () => {
    if (wsConnection) {
      wsConnection.close();
    }
    setQrCode('');
    setTimeLeft(45);
    handleGenerateQR();
  };

  const handleCloseModal = () => {
    if (wsConnection) {
      wsConnection.close();
    }
    setShowQRModal(false);
    setQrCode('');
    setConnectionStatus('Desconectado');
  };

  const progressPercentage = (timeLeft / 45) * 100;
  const progressColor = timeLeft > 30 ? '#00ffff' : timeLeft > 15 ? '#f59e0b' : '#ef4444';

  if (!instanceData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header com Logo */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <img src={logoVolxo} alt="Volxo" className="h-10" />
            <div className="h-8 w-px bg-gray-700"></div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-400 hover:text-[#00ffff] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar para Dashboard</span>
            </button>
          </div>

          <div className="flex gap-3">
            <button className="px-4 py-2 bg-[#111111] border border-gray-800 hover:border-[#00ffff] rounded-lg transition-all flex items-center gap-2 text-gray-300 hover:text-[#00ffff]">
              <LinkIcon className="w-4 h-4" />
              Gerar Link de Conexão
            </button>
            <button className="px-4 py-2 bg-[#111111] border border-gray-800 hover:border-red-500 rounded-lg transition-all text-gray-300 hover:text-red-500 flex items-center gap-2">
              <Power className="w-4 h-4" />
              Desconectar
            </button>
            <button className="px-4 py-2 bg-red-600/10 border border-red-600/50 hover:bg-red-600/20 rounded-lg transition-all text-red-500 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Excluir Instância
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center">
          {/* Avatar com brilho neon */}
          <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-[#00ffff]/20 to-[#0a0a0a] rounded-full flex items-center justify-center text-4xl font-bold border-2 border-[#00ffff]/30 shadow-[0_0_30px_rgba(0,255,255,0.3)]">
            {instanceData.name.charAt(0).toUpperCase()}
          </div>

          {/* Instance Name com efeito neon */}
          <h1 className="text-4xl font-bold mb-3 text-shadow-neon">{instanceData.name}</h1>
          
          {/* Reference Number */}
          <div className="flex items-center justify-center gap-2 text-gray-400 mb-4">
            <span>ID da Instância:</span>
            <span className="text-[#00ffff] font-mono font-semibold">{instanceId}</span>
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#111111] border border-gray-800 rounded-full mb-8">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'Desconectado' ? 'bg-gray-500' : 
              connectionStatus.includes('Conectado') ? 'bg-green-500 animate-pulse' : 
              'bg-yellow-500 animate-pulse'
            }`}></div>
            <span className="text-gray-300">{connectionStatus}</span>
          </div>

          {/* Phone Number (se conectado) */}
          {instanceData.phoneNumber && (
            <div className="mb-8 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400">
                📱 Número conectado: <span className="font-mono font-bold">{instanceData.phoneNumber}</span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 max-w-md mx-auto">
            <button
              onClick={handleGenerateQR}
              className="group relative w-full py-4 bg-gradient-to-r from-[#00ffff] to-[#00cccc] hover:from-[#00cccc] hover:to-[#00ffff] rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-black shadow-[0_0_20px_rgba(0,255,255,0.5)] hover:shadow-[0_0_30px_rgba(0,255,255,0.8)]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Gerar QR Code para Conectar WhatsApp
            </button>

            <button className="w-full py-4 bg-[#111111] border border-gray-800 hover:border-[#00ffff] rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-gray-300 hover:text-[#00ffff]">
              <RefreshCw className="w-5 h-5" />
              Reiniciar Instância
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#00ffff]/30 rounded-2xl max-w-md w-full p-8 relative shadow-[0_0_50px_rgba(0,255,255,0.3)]">
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-[#00ffff] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Title */}
            <h2 className="text-2xl font-bold mb-6 text-center text-shadow-neon">Conectar WhatsApp</h2>

            {/* QR Code */}
            <div className="bg-white p-6 rounded-xl mb-6 shadow-[0_0_30px_rgba(0,255,255,0.2)]">
              {isConnecting ? (
                <div className="w-full aspect-square flex items-center justify-center">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#00ffff] border-t-transparent"></div>
                    <div className="absolute inset-0 rounded-full bg-[#00ffff]/20 blur-xl"></div>
                  </div>
                </div>
              ) : qrCode ? (
                <QRCode value={qrCode} size={256} className="w-full h-auto" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="animate-pulse text-4xl mb-2">📱</div>
                    <p>Gerando QR Code...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Timer */}
            {qrCode && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Tempo restante</span>
                  <span className="font-semibold text-[#00ffff]">{timeLeft}s</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full transition-all duration-1000 ease-linear shadow-[0_0_10px_currentColor]"
                    style={{
                      width: `${progressPercentage}%`,
                      backgroundColor: progressColor
                    }}
                  />
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-[#00ffff]/5 border border-[#00ffff]/20 rounded-lg p-4 mb-4">
              <p className="text-center text-gray-300 text-sm mb-2">
                📱 <strong>Escaneie o QR Code</strong> com seu WhatsApp para conectar
              </p>
              <p className="text-center text-xs text-gray-500">
                O QR Code expira em 45 segundos
              </p>
            </div>

            {/* Status */}
            <div className="flex items-center justify-center gap-2 text-gray-400 mb-6">
              <div className={`w-2 h-2 rounded-full ${
                isConnecting ? 'bg-yellow-500 animate-pulse' : 
                connectionStatus.includes('Conectado') ? 'bg-green-500 animate-pulse' : 
                'bg-[#00ffff] animate-pulse'
              }`}></div>
              <span className="text-sm">{connectionStatus}</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefreshQR}
              disabled={isConnecting || (timeLeft > 0 && qrCode)}
              className="w-full py-3 bg-[#00ffff]/10 border border-[#00ffff]/30 hover:bg-[#00ffff]/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-[#00ffff] hover:shadow-[0_0_20px_rgba(0,255,255,0.3)]"
            >
              <RefreshCw className="w-5 h-5" />
              Atualizar QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

