// src/ConnectWhatsApp.jsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { apiRequest, API_ENDPOINTS, createWebSocket } from "./config/api";

const DURATION = 45_000; // 45s

export default function ConnectWhatsApp() {
  const { instanceId } = useParams();
  const navigate = useNavigate();

  const [qr, setQr] = useState("");
  const [progress, setProgress] = useState(100);
  const [status, setStatus] = useState("waiting"); // waiting|qr|ready|expired|error
  const [phone, setPhone] = useState("");
  const [profile, setProfile] = useState("");

  const wsRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // abre WS já no mount
    wsRef.current = createWebSocket(instanceId, {
      onRegistered: () => {
        // assim que registrar, pedimos para gerar QR
        startConnection();
      },
      onQR: (data) => {
        setQr(data);
        setStatus("qr");
        startTimer();
      },
      onStatus: (msg) => {
        if (msg === "ready" || msg.startsWith("state:")) {
          setStatus("ready");
        } else if (msg === "init_failed") {
          setStatus("error");
        }
      },
      onPhone: (n) => {
        setPhone(n);
        setStatus("ready");
      },
      onProfile: (url) => setProfile(url),
    });

    return () => {
      wsRef.current && wsRef.current.close();
      clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId]);

  function startTimer() {
    clearInterval(timerRef.current);
    setProgress(100);
    const step = 100 / (DURATION / 100);
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
    }, 100);
  }

  async function startConnection() {
    setStatus("waiting");
    setQr("");
    setPhone("");
    setProfile("");
    try {
      await apiRequest(API_ENDPOINTS.CONNECT_WHATSAPP, {
        method: "POST",
        body: JSON.stringify({ instanceId }),
      });
    } catch {
      setStatus("error");
    }
  }

  function renderBody() {
    const barColor =
      progress > 66 ? "#0ff" : progress > 33 ? "#facc15" : "#f87171";

    if (status === "ready") {
      return (
        <>
          <div style={{ marginBottom: 16, textAlign: "center" }}>
            {profile ? (
              <img
                alt="profile"
                src={profile}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 999,
                  display: "inline-block",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 999,
                  background: "#111",
                  display: "inline-block",
                }}
              />
            )}
          </div>
          <h2 style={{ color: "#34d399", marginBottom: 8, textAlign: "center" }}>
            Conectado!
          </h2>
          {phone && (
            <p style={{ color: "#ddd", textAlign: "center", marginBottom: 16 }}>
              Número: <strong style={{ color: "#fff" }}>{phone}</strong>
            </p>
          )}
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => navigate("/")}
              style={btnPrimary}
            >
              Voltar ao Dashboard
            </button>
          </div>
        </>
      );
    }

    if (status === "expired") {
      return (
        <>
          <p style={{ color: "#f87171", textAlign: "center", marginBottom: 16 }}>
            QR Code expirado
          </p>
          <div style={{ textAlign: "center" }}>
            <button onClick={startConnection} style={btnPrimary}>
              Gerar novo QR Code
            </button>
          </div>
        </>
      );
    }

    if (status === "error") {
      return (
        <>
          <p style={{ color: "#f87171", textAlign: "center", marginBottom: 16 }}>
            Ocorreu um erro ao inicializar a conexão. Tente novamente.
          </p>
          <div style={{ textAlign: "center" }}>
            <button onClick={startConnection} style={btnPrimary}>
              Tentar novamente
            </button>
          </div>
        </>
      );
    }

    // waiting ou qr
    return (
      <>
        <h2 style={{ color: "#fff", textAlign: "center", marginBottom: 16 }}>
          Escaneie o QR Code
        </h2>
        <div
          style={{
            background: "#fff",
            padding: 24,
            borderRadius: 24,
            width: 360,
            height: 360,
            margin: "0 auto 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {qr ? <QRCode value={qr} size={300} /> : null}
        </div>
        <div style={{ width: 540, maxWidth: "90%", margin: "0 auto" }}>
          <div
            style={{
              height: 6,
              width: "100%",
              background: "#111827",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: barColor,
                transition: "width 100ms linear",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
              color: "#9ca3af",
              fontSize: 12,
            }}
          >
            <span>Tempo restante</span>
            <span>{Math.ceil((progress / 100) * (DURATION / 1000))}s</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={page}>
      <div style={card}>{renderBody()}</div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "#0b0f12",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};
const card = {
  width: 720,
  maxWidth: "100%",
  background: "#0d1117",
  border: "1px solid rgba(0,255,255,.2)",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 0 32px rgba(0,255,255,.05)",
};
const btnPrimary = {
  background: "#06b6d4",
  color: "#001014",
  padding: "12px 20px",
  borderRadius: 12,
  border: "none",
  fontWeight: 700,
  cursor: "pointer",
};
