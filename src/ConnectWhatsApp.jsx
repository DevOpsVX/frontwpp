// src/ConnectWhatsApp.jsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { apiRequest, API_ENDPOINTS, createWebSocket } from "./config/api";

export default function ConnectWhatsApp(props) {
  const params = useParams();
  const navigate = useNavigate();
  const instanceFromRoute = params.instanceName;
  const instanceName = props.instanceName || instanceFromRoute;

  const [qr, setQr] = useState("");
  const [status, setStatus] = useState("Aguardando QR...");
  const [error, setError] = useState("");
  const esRef = useRef(null);

  useEffect(() => {
    if (!instanceName) {
      setError("instanceName é obrigatório");
      return;
    }

    // Abre stream SSE
    esRef.current = createWebSocket(API_ENDPOINTS.qr(instanceName), {
      onQr: (payload) => {
        const value = typeof payload === "string" ? payload : payload.qr;
        setQr(value || "");
        setStatus("Escaneie o QR Code");
        setError("");
      },
      onStatus: (payload) => {
        if (payload?.authenticated) setStatus("Autenticado! Aguardando pronto...");
        if (payload?.ready) setStatus("Conectado. Você já pode fechar.");
        if (payload?.disconnected) setStatus("Desconectado.");
      },
      onError: () => {
        setError("Falha ao solicitar conexão. Tente novamente.");
      },
    });

    return () => {
      try { esRef.current?.close(); } catch {}
    };
  }, [instanceName]);

  const reloadQr = () => {
    try { esRef.current?.close(); } catch {}
    setQr("");
    setStatus("Atualizando QR...");
    setError("");

    esRef.current = createWebSocket(API_ENDPOINTS.qr(instanceName), {
      onQr: (payload) => {
        const value = typeof payload === "string" ? payload : payload.qr;
        setQr(value || "");
        setStatus("Escaneie o QR Code");
      },
      onStatus: (payload) => {
        if (payload?.authenticated) setStatus("Autenticado! Aguardando pronto...");
        if (payload?.ready) setStatus("Conectado. Você já pode fechar.");
        if (payload?.disconnected) setStatus("Desconectado.");
      },
      onError: () => setError("Falha ao solicitar conexão. Tente novamente."),
    });
  };

  const close = () => {
    if (props.onClose) props.onClose();
    else navigate("/");
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
      <div className="bg-[#0b0f12] border border-[#1f2937] rounded-2xl p-6 w-[460px] flex flex-col items-center gap-4">
        <h3 className="text-xl">Escaneie o QR Code</h3>
        <div className="bg-white p-4 rounded">
          {qr ? <QRCode value={qr} /> : <div className="w-[256px] h-[256px]" />}
        </div>
        <div className="text-sm text-gray-300">{status}</div>
        {error && <div className="text-sm text-red-300">{error}</div>}
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded bg-[#222]" onClick={close}>
            Fechar
          </button>
          <button className="px-3 py-2 rounded bg-cyan-400 text-black" onClick={reloadQr}>
            Atualizar QR
          </button>
        </div>
      </div>
    </div>
  );
}
