import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import QRCode from "react-qr-code";
import { apiRequest, API_ENDPOINTS, createWebSocket } from "./config/api";

export default function ConnectWhatsApp() {
  const { instanceId } = useParams();
  const [qr, setQr] = useState("");
  const [progress, setProgress] = useState(100);
  const [status, setStatus] = useState("waiting");
  const [phone, setPhone] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    const ws = createWebSocket(instanceId, {
      qr: (msg) => {
        setQr(msg.data);
        setStatus("qr");
        startTimer();
      },
      status: (msg) => {
        if (msg.message === "ready") setStatus("ready");
      },
    });
    apiRequest(API_ENDPOINTS.CONNECT_WHATSAPP, {
      method: "POST",
      body: JSON.stringify({ instanceId }),
    });
    return () => {
      ws.close();
      clearInterval(timer.current);
    };
  }, [instanceId]);

  function startTimer() {
    clearInterval(timer.current);
    setProgress(100);
    timer.current = setInterval(() => {
      setProgress((p) => (p <= 0 ? 0 : p - 0.5));
    }, 250);
  }

  return (
    <div style={page}>
      <div style={card}>
        {status === "qr" && (
          <>
            <h2 style={h2}>Escaneie o QR Code</h2>
            <div style={qrBox}>
              <QRCode value={qr} size={280} />
            </div>
            <div style={progressBar(progress)} />
          </>
        )}
        {status === "ready" && (
          <>
            <h2 style={success}>✅ Conectado com sucesso!</h2>
            {phone && <p>Número: {phone}</p>}
          </>
        )}
      </div>
    </div>
  );
}

const page = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  background: "#000",
};

const card = {
  background: "#0d1117",
  borderRadius: 20,
  padding: 30,
  color: "#fff",
  textAlign: "center",
  boxShadow: "0 0 20px rgba(0,255,255,0.1)",
};

const qrBox = {
  background: "#fff",
  padding: 20,
  borderRadius: 20,
  display: "inline-block",
  marginBottom: 20,
};

const h2 = { color: "#0ff", marginBottom: 10 };
const success = { color: "#22c55e", marginBottom: 10 };

function progressBar(p) {
  return {
    width: "100%",
    height: 6,
    borderRadius: 4,
    background: `linear-gradient(to right, #0ff ${p}%, #222 ${p}%)`,
    transition: "all .2s linear",
  };
}
