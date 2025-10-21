import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { apiRequest, API_ENDPOINTS, createWebSocket } from "./config/api";

export default function ConnectWhatsApp() {
  const { instanceId } = useParams();
  const navigate = useNavigate();

  const [qr, setQr] = useState("");
  const [status, setStatus] = useState("waiting"); // waiting | generating | connected | expired
  const [phone, setPhone] = useState("");
  const [progress, setProgress] = useState(100);
  const wsRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // abre WS e registra; só depois pede o connect
    wsRef.current = createWebSocket(instanceId, {
      onOpen: () => {},
      onRegistered: async () => {
        try {
          await apiRequest(API_ENDPOINTS.CONNECT_WHATSAPP, {
            method: "POST",
            body: JSON.stringify({ instanceId })
          });
        } catch (e) {
          console.error("connect error:", e);
        }
      },
      onQR: (data) => {
        setQr(data);
        setStatus("generating");
        startTimer();
      },
      onStatus: (msg) => {
        const m = (msg || "").toLowerCase();
        if (m.includes("ready") || m.includes("authenticated")) setStatus("connected");
        if (m.includes("waiting_qr") && !qr) setStatus("waiting");
      },
      onPhone: (n) => {
        setPhone(n);
        setStatus("connected");
      },
      onError: (e) => console.error("WS error:", e),
      onClose: () => {}
    });

    return () => {
      try { wsRef.current?.close(); } catch {}
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [instanceId]);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);
    const duration = 45_000;
    const step = 100;
    const dec = (step / duration) * 100;
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        const np = p - dec;
        if (np <= 0) {
          clearInterval(timerRef.current);
          setStatus("expired");
          return 0;
        }
        return np;
      });
    }, step);
  };

  const regenerate = async () => {
    setQr("");
    setStatus("waiting");
    setProgress(100);
    try {
      await apiRequest(API_ENDPOINTS.RESTART_WHATSAPP(instanceId), { method: "POST" });
    } catch {}
    await apiRequest(API_ENDPOINTS.CONNECT_WHATSAPP, {
      method: "POST",
      body: JSON.stringify({ instanceId })
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-[460px] rounded-2xl p-6 bg-neutral-900/60 border border-cyan-500/30 shadow-2xl">
        <h2 className="text-center text-xl font-bold text-cyan-300 mb-4">Conectar WhatsApp</h2>

        <div className="bg-white rounded-xl p-6 mx-auto w-[320px] h-[320px] flex items-center justify-center">
          {status === "generating" && qr ? (
            <QRCode value={qr} size={260} />
          ) : status === "expired" ? (
            <span className="text-red-500 font-semibold">QR expirado</span>
          ) : (
            <span className="text-gray-500">Gerando QR Code...</span>
          )}
        </div>

        <div className="mt-4 text-center text-sm text-gray-300">
          {status !== "connected" ? (
            <>Escaneie o QR Code com seu WhatsApp. {status === "generating" && <>Expira em {Math.ceil((progress / 100) * 45)}s</>} </>
          ) : (
            <>✅ Conectado {phone ? `(${phone})` : ""}</>
          )}
        </div>

        {status !== "connected" && (
          <div className="mt-4">
            <button
              onClick={regenerate}
              className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
            >
              Atualizar QR Code
            </button>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={() => navigate("/")}
            className="w-full py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white"
          >
            Voltar ao dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
