// src/ConnectWhatsApp.jsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_ENDPOINTS, apiRequest, createWebSocket } from "./config/api";
import QRCode from "react-qr-code";
import { Power, RefreshCw, Check, AlertCircle } from "lucide-react";

export default function ConnectWhatsApp() {
  const { instanceId } = useParams();
  const navigate = useNavigate();

  const [qr, setQr] = useState("");
  const [status, setStatus] = useState("waiting"); // waiting|generating|connected|expired
  const [phone, setPhone] = useState("");
  const [progress, setProgress] = useState(100);
  const wsRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    wsRef.current = createWebSocket(instanceId, {
      onOpen: () => {},
      onQR: (q) => {
        setQr(q);
        setStatus("generating");
        startTimer();
      },
      onStatus: (m) => {
        if (!m) return;
        const lower = String(m).toLowerCase();
        if (lower.includes("authenticated") || lower.includes("ready")) {
          setStatus("connected");
        }
      },
      onPhone: (n) => {
        setPhone(n);
        setStatus("connected");
      },
      onError: () => {},
      onClose: () => {},
    });

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId]);

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);

    const duration = 45000; // 45s
    const interval = 100;
    const step = (interval / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((p) => {
        const np = p - step;
        if (np <= 0) {
          clearInterval(timerRef.current);
          setStatus("expired");
          return 0;
        }
        return np;
      });
    }, interval);
  }

  async function startConnection() {
    try {
      setStatus("generating");
      await apiRequest(API_ENDPOINTS.CONNECT_WHATSAPP, {
        method: "POST",
        body: JSON.stringify({ instanceId }),
      });
      // Se o WS não devolver o QR (ambiente free), fica aguardando
    } catch (e) {
      alert("Erro ao iniciar conexão");
      setStatus("waiting");
    }
  }

  function regen() {
    setQr("");
    setProgress(100);
    setStatus("waiting");
    startConnection();
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto">
          <div className="instance-card text-center">
            {status === "waiting" && (
              <>
                <h2 className="text-2xl font-bold text-white mb-4">Conectar WhatsApp</h2>
                <p className="text-gray-400 mb-6">Instância: {instanceId}</p>
                <button className="btn-primary inline-flex items-center gap-2" onClick={startConnection}>
                  <Power size={18} /> Iniciar Conexão e Gerar QR Code
                </button>
              </>
            )}

            {status === "generating" && (
              <>
                <h2 className="text-2xl font-bold text-white mb-6">Escaneie o QR Code</h2>
                <div className="bg-white p-6 rounded-2xl inline-block mb-6">
                  {qr ? <QRCode value={qr} size={256} /> : <div className="w-[256px] h-[256px]" />}
                </div>

                {/* barra de tempo */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Tempo restante</span>
                    <span className="text-sm font-bold text-white">
                      {Math.ceil((progress / 100) * 45)}s
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${progress}%` }} />
                  </div>
                  {progress < 33 && (
                    <p className="text-red-400 text-sm mt-2 flex items-center justify-center gap-2">
                      <AlertCircle size={16} /> QR Code expirando em breve!
                    </p>
                  )}
                </div>
              </>
            )}

            {status === "expired" && (
              <>
                <div className="inline-block p-8 rounded-full bg-red-500/10 mb-6">
                  <AlertCircle size={64} className="text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">QR Code expirado</h2>
                <button className="btn-primary inline-flex items-center gap-2" onClick={regen}>
                  <RefreshCw size={18} /> Atualizar QR Code
                </button>
              </>
            )}

            {status === "connected" && (
              <>
                <div className="inline-block p-8 rounded-full bg-green-500/10 mb-6">
                  <Check size={64} className="text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-green-400 mb-3">Conectado!</h2>
                {phone && <p className="text-gray-300">Número: <b className="text-white">{phone}</b></p>}
                <button className="btn-primary mt-6" onClick={() => navigate("/")}>
                  Voltar ao Dashboard
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
