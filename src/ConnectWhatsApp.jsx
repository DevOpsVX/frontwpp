import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { ArrowLeft, RefreshCw, Link as LinkIcon, X } from 'lucide-react';

export default function ConnectWhatsApp() {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  
  const [instanceData, setInstanceData] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Desconectado');

  useEffect(() => {
    // Buscar dados da instância do Supabase ou localStorage
    const mockData = {
      id: instanceId,
      name: instanceId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      reference: '1',
      status: 'disconnected'
    };
    setInstanceData(mockData);
  }, [instanceId]);

  useEffect(() => {
    if (showQRModal && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showQRModal, timeLeft]);

  const handleGenerateQR = async () => {
    setShowQRModal(true);
    setIsConnecting(true);
    setTimeLeft(30);
    setConnectionStatus('Gerando QR Code...');

    try {
      // Chamar API do backend para gerar QR Code
      const response = await fetch(`${import.meta.env.VITE_API_URL}/whatsapp/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: instanceId })
      });

      const data = await response.json();
      
      // Conectar WebSocket para receber QR Code
      const ws = new WebSocket(import.meta.env.VITE_WS_URL);
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'register',
          instanceId: instanceId
        }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'qr') {
          setQrCode(message.data);
          setConnectionStatus('Verificando conexão...');
          setIsConnecting(false);
        } else if (message.type === 'phone') {
          setConnectionStatus('Conectado!');
          setTimeout(() => {
            navigate('/');
          }, 2000);
        }
      };

    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      setConnectionStatus('Erro ao gerar QR Code');
      setIsConnecting(false);
    }
  };

  const handleRefreshQR = () => {
    setQrCode('');
    setTimeLeft(30);
    handleGenerateQR();
  };

  const progressPercentage = (timeLeft / 30) * 100;
  const progressColor = timeLeft > 15 ? '#10b981' : timeLeft > 5 ? '#f59e0b' : '#ef4444';

  if (!instanceData) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar para lista</span>
          </button>

          <div className="flex gap-3">
            <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Gerar Link White-Label
            </button>
            <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
              Desconectar GHL
            </button>
            <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
              Acesso Direto
            </button>
            <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
              Recriar Instância
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center">
          {/* Avatar */}
          <div className="w-32 h-32 mx-auto mb-6 bg-gray-700 rounded-full flex items-center justify-center text-4xl font-bold">
            {instanceData.name.charAt(0).toUpperCase()}
          </div>

          {/* Instance Name */}
          <h1 className="text-3xl font-bold mb-2">{instanceData.name}</h1>
          
          {/* Reference Number */}
          <div className="flex items-center justify-center gap-2 text-gray-400 mb-4">
            <span>Nº de Referência:</span>
            <span className="text-white font-semibold">{instanceData.reference}</span>
            <button className="text-gray-400 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>

          {/* Status */}
          <p className="text-gray-400 mb-4">{connectionStatus}</p>
          
          {/* Status Badge */}
          <div className="inline-block px-4 py-2 bg-gray-700 rounded-full text-gray-300 mb-8">
            Desconectado
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 max-w-md mx-auto">
            <button
              onClick={handleGenerateQR}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Gerar QR Code para Conectar
            </button>

            <button className="w-full py-4 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Reiniciar
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e2732] rounded-2xl max-w-md w-full p-8 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Title */}
            <h2 className="text-2xl font-bold mb-6 text-center">Conectar WhatsApp</h2>

            {/* QR Code */}
            <div className="bg-white p-6 rounded-xl mb-6">
              {isConnecting ? (
                <div className="w-full aspect-square flex items-center justify-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent"></div>
                </div>
              ) : qrCode ? (
                <QRCode value={qrCode} size={256} className="w-full h-auto" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-gray-400">
                  Gerando QR Code...
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Tempo restante</span>
                <span className="font-semibold">{timeLeft}s</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${progressPercentage}%`,
                    backgroundColor: progressColor
                  }}
                />
              </div>
            </div>

            {/* Instructions */}
            <p className="text-center text-gray-400 mb-2">
              Escaneie o QR code com seu WhatsApp para conectar sua instância.
            </p>
            <p className="text-center text-sm text-gray-500 mb-6">
              O QR code expira em 30 segundos e será atualizado automaticamente.
            </p>

            {/* Status */}
            <div className="flex items-center justify-center gap-2 text-gray-400 mb-6">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span>{connectionStatus}</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefreshQR}
              disabled={timeLeft > 0 && qrCode}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
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

