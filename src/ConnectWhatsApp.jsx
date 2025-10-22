// src/ConnectWhatsApp.jsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { API_ENDPOINTS, createWebSocket } from "./config/api";

export default function ConnectWhatsApp() {
  const { instanceName } = useParams();
  const navigate = useNavigate();

  const [qr, setQr] = useState("");
  const [status, setStatus] = useState("Aguardando QR...");
  const [error, setError] = useState("");
  const esRef = useRef(null);

  const startStream = () => {
    if (!instanceName) {
      setError("instanceName é obrigatório");
      return;
    }
    try { esRef.current?.close(); } catch {}
    setQr(""); setError(""); setStatus("Aguardando QR...");

    esRef.current = createWebSocket(API_ENDPOINTS.qr(instanceName), {
      onQr: (payload) => {
        const value = typeof payload === "string" ? payload : payload?.qr;
        setQr(value || "");
        setStatus("Escaneie o QR Code");
      },
      onStatus: (p) => {
        if (p?.authenticated) setStatus("Autenticado! Aguardando pronto...");
        if (p?.ready) setStatus("Conectado. Você já pode fechar.");
        if (p?.disconnected) setStatus("Desconectado.");
      },
      onError: () => setError("Falha ao solicitar conexão. Tente novamente."),
    });
  };

  useEffect(() => {
    startStream();
    return () => { try { esRef.current?.close(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceName]);

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center">
      <div className="bg-[#0e1216] border border-[#1f2937] rounded-2xl p-6 w-[460px] flex flex-col items-center gap-4">
        <h3 className="text-xl">Escaneie o QR Code</h3>
        <div className="bg-white p-4 rounded">
          {qr ? <QRCode value={qr} /> : <div className="w-[256px] h-[256px]" />}
        </div>
        <div className="text-sm text-gray-300">{status}</div>
        {error && <div className="text-sm text-red-300">{error}</div>}
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded bg-[#222]" onClick={() => navigate("/")}>
            Fechar
          </button>
          <button className="px-3 py-2 rounded bg-cyan-400 text-black" onClick={startStream}>
            Atualizar QR
          </button>
        </div>
      </div>
    </div>
  );
}
