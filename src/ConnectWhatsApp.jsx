import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { apiRequest, API_ENDPOINTS, createWebSocket } from "./config/api";

export default function ConnectWhatsApp() {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const [qr, setQr] = useState("");
  const [status, setStatus] = useState("waiting"); // waiting|qr|ready|error
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(100);
  const timer = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    // Abre WS
    wsRef.current = createWebSocket(instanceId, {
      onQR: (msg) => {
        setQr(msg.data);
        setStatus("qr");
        startTimer();
      },
      onStatus: (m) => {
        const message = typeof m === "string" ? m : m?.message || "";
        if (message.startsWith("retrying")) {
          setStatus("waiting");
        } else if (message === "ready" || message === "authenticated") {
          setStatus("ready");
          stopTimer();
        }
      },
      onPhone: (msg) => {
        // opcional: mostrar número
        console.log("phone:", msg.number);
      },
      onError: (m) => {
        setErrorMsg(typeof m === "string" ? m : m?.message || "Erro inesperado");
        setStatus("error");
        stopTimer();
      },
      onClose: () => {
        // se fechar inesperado e não estiver pronto, deixa usuário tentar de novo
        if (status !== "ready") setStatus("error");
      },
    });

    // dispara o connect no backend
    triggerConnect();

    return () => {
      if (wsRef.current) wsRef.current.close();
      stopTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId]);

  function stopTimer() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  function startTimer() {
    stopTimer();
    setProgress(100);
    const duration = 45_000;
    const started = Date.now();
    timer.current = setInterval(() => {
      const elapsed = Date.now() - started;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (elapsed >= duration) {
        stopTimer();
        setStatus("error");
        setErrorMsg("QR Code expirou. Gere novamente.");
      }
    }, 250);
  }

  async function triggerConnect() {
    setErrorMsg("");
    setStatus("waiting");
    setQr("");
    try {
      await apiRequest(API_ENDPOINTS.CONNECT_WHATSAPP, {
        method: "POST",
        body: JSON.stringify({ instanceId }),
      });
    } catch (e) {
      setStatus("error");
      setErrorMsg("Falha ao solicitar conexão. Tente novamente.");
    }
  }

  const renderCenter = () => {
    if (status === "waiting") {
      return <p style={muted}>Gerando QR Code…</p>;
    }
    if (status === "qr") {
      return (
        <>
          <div style={qrBox}>
            <QRCode value={qr} size={260} />
          </div>
          <div style={progressWrap}>
            <div style={progressFill(progress)} />
          </div>
          <p style={muted}>Escaneie com seu WhatsApp. O QR expira em 45s.</p>
          <button style={btn} onClick={triggerConnect}>Atualizar QR Code</button>
        </>
      );
    }
    if (status === "ready") {
      return (
        <>
          <h2 style={ok}>✅ Conectado!</h2>
          <button style={btn} onClick={() => navigate("/")}>Voltar</button>
        </>
      );
    }
    if (status === "error") {
      return (
        <>
          <h3 style={err}>Erro</h3>
          <p style={muted}>{errorMsg || "Algo deu errado."}</p>
          <button style={btn} onClick={triggerConnect}>Tentar novamente</button>
        </>
      );
    }
    return null;
  };

  return (
    <div style={page}>
      <div style={card}>
        <h2 style={title}>Escaneie o QR Code</h2>
        {renderCenter()}
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#000",
};

const card = {
  width: 420,
  maxWidth: "90vw",
  color: "#fff",
  background: "#0d1117",
  borderRadius: 20,
  padding: 28,
  boxShadow: "0 0 30px rgba(0,255,255,.1)",
  textAlign: "center",
};

const title = { color: "#0ff", marginTop: 0 };
const ok = { color: "#22c55e" };
const err = { color: "#ef4444" };
const muted = { color: "#a1a1aa" };

const qrBox = {
  display: "inline-block",
  background: "#fff",
  borderRadius: 16,
  padding: 18,
  margin: "12px 0 18px",
};

const progressWrap = {
  width: "100%",
  height: 6,
  background: "#1f2937",
  borderRadius: 6,
  overflow: "hidden",
  marginBottom: 10,
};

const progressFill = (p) => ({
  height: "100%",
  width: `${p}%`,
  background: "#06b6d4",
  transition: "width .2s linear",
});

const btn = {
  background: "#06b6d4",
  color: "#000",
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  cursor: "pointer",
};
