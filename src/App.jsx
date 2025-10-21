// App.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useParams,
} from "react-router-dom";
import QRCode from "react-qr-code";

// -------------------- CONFIG --------------------
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://volxowppconect.onrender.com";
const WS_URL =
  import.meta.env.VITE_WS_URL || "wss://volxowppconect.onrender.com";

const GHL = {
  CLIENT_ID: import.meta.env.VITE_GHL_CLIENT_ID,
  AUTH_URL:
    import.meta.env.VITE_GHL_AUTH_URL ||
    "https://marketplace.gohighlevel.com/oauth/chooselocation",
  REDIRECT_URI:
    import.meta.env.VITE_GHL_REDIRECT_URI ||
    "https://volxowppconect.onrender.com/leadconnectorhq/oauth/callback",
};

// Escopos recomendados (ajuste conforme seu app)
const GHL_SCOPES = [
  "conversations.readonly",
  "conversations.write",
  "conversations/message.readonly",
  "conversations/message.write",
  "contacts.readonly",
  "contacts.write",
  "locations.readonly",
  "locations.write",
].join(" ");

async function api(path, init) {
  const r = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(t || `HTTP ${r.status}`);
  }
  return r.json().catch(() => ({}));
}

function openWS(instanceId, handlers) {
  const ws = new WebSocket(WS_URL.replace(/^http/, "ws"));
  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({ type: "register", instanceId }));
    handlers?.open?.();
  });
  ws.addEventListener("message", (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === "qr") handlers?.qr?.(msg.data);
      if (msg.type === "status") handlers?.status?.(msg.message);
      if (msg.type === "phone") handlers?.phone?.(msg.number);
    } catch {}
  });
  ws.addEventListener("error", (e) => handlers?.error?.(e));
  ws.addEventListener("close", () => handlers?.close?.());
  return ws;
}

// -------------------- UI BÁSICA --------------------
function Header({ onNew }) {
  return (
    <header
      style={{
        padding: "16px 24px",
        borderBottom: "1px solid #222",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(0,0,0,0.4)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div>
        <h1 style={{ margin: 0, color: "#4ef2f2" }}>Volxo</h1>
        <small style={{ color: "#999" }}>Gerenciador de Instâncias WhatsApp</small>
      </div>
      <button
        onClick={onNew}
        style={{
          background: "#35f0f0",
          border: 0,
          borderRadius: 10,
          padding: "10px 16px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        + Nova Instância
      </button>
    </header>
  );
}

function CreateInstanceModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setErr("");
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    const valid = /^[a-z0-9-]{3,50}$/.test(name);
    if (!valid) {
      setErr("Use 3-50 caracteres: minúsculas, números e hífens (-).");
      return;
    }
    setBusy(true);
    try {
      await onCreate(name);
    } catch (e) {
      setErr(e.message || "Erro ao criar");
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.85)",
        display: "grid",
        placeItems: "center",
        zIndex: 100,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: 420,
          background: "#0b0b0b",
          border: "1px solid #144",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 0 40px rgba(0,255,255,.2)",
        }}
      >
        <h2 style={{ color: "#4ef2f2", marginTop: 0 }}>Nova Instância</h2>
        <label style={{ color: "#ddd", fontSize: 13 }}>Nome da instância *</label>
        <input
          autoFocus
          value={name}
          onChange={(e) =>
            setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
          }
          placeholder="minha-instancia"
          style={{
            width: "100%",
            marginTop: 8,
            padding: "10px 12px",
            background: "#0f0f0f",
            border: "1px solid #222",
            color: "#fff",
            borderRadius: 10,
          }}
        />
        <div style={{ fontSize: 12, color: "#777", marginTop: 6 }}>
          Apenas letras minúsculas, números e hífens (-)
        </div>
        {err && (
          <div style={{ color: "#ff6", marginTop: 10, fontSize: 12 }}>{err}</div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              flex: 1,
              background: "#111",
              color: "#eee",
              border: "1px solid #333",
              borderRadius: 10,
              padding: "10px 12px",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            style={{
              flex: 1,
              background: "#35f0f0",
              border: 0,
              borderRadius: 10,
              padding: "10px 12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {busy ? "Redirecionando..." : "Continuar para Login GHL"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Dashboard() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  const load = async () => {
    try {
      const data = await api("/api/installations");
      setItems(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter(
    (x) =>
      (x.name || "").toLowerCase().includes(q.toLowerCase()) ||
      (x.id || "").toLowerCase().includes(q.toLowerCase())
  );

  const startCreate = async (name) => {
    // cria linha no Supabase (sem tokens)
    await api("/api/instances", {
      method: "POST",
      body: JSON.stringify({ name }),
    });

    // salva nome no localStorage (usa no state do callback)
    localStorage.setItem(
      "volxo_pending_instance_name",
      JSON.stringify({ name, ts: Date.now() })
    );

    // monta URL OAuth GHL com SCOPES GARANTIDOS
    const state = btoa(JSON.stringify({ instanceName: name, t: Date.now() }));
    const url =
      `${GHL.AUTH_URL}?response_type=code` +
      `&client_id=${encodeURIComponent(GHL.CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(GHL.REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(GHL_SCOPES)}` +
      `&state=${encodeURIComponent(state)}`;

    window.location.href = url;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#eee" }}>
      <Header onNew={() => setOpen(true)} />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar instâncias..."
            style={{
              flex: 1,
              padding: "10px 12px",
              background: "#0f0f0f",
              border: "1px solid #222",
              color: "#fff",
              borderRadius: 10,
            }}
          />
          <div
            style={{
              background: "#0f0f0f",
              border: "1px solid #222",
              borderRadius: 10,
              padding: "10px 12px",
              minWidth: 140,
              textAlign: "center",
            }}
          >
            Ativas:{" "}
            <b style={{ color: "#4ef2f2" }}>
              {items.filter((i) => i.status === "connected").length}
            </b>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Nenhuma instância.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
            }}
          >
            {filtered.map((i) => (
              <div
                key={i.id}
                style={{
                  background: "#0b0b0b",
                  border: "1px solid #133",
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{i.name}</div>
                  <span
                    style={{
                      fontSize: 12,
                      color: i.status === "connected" ? "#7ef27e" : "#aaa",
                    }}
                  >
                    {i.status === "connected" ? "Conectado" : "Pendente"}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>{i.id}</div>
                {i.phone && (
                  <div style={{ marginTop: 6, color: "#aaa", fontSize: 13 }}>
                    📱 {i.phone}
                  </div>
                )}
                <button
                  onClick={() => nav(`/connect/${encodeURIComponent(i.id)}`)}
                  style={{
                    marginTop: 12,
                    width: "100%",
                    background: "#35f0f0",
                    border: 0,
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Conectar
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <CreateInstanceModal
        open={open}
        onClose={() => setOpen(false)}
        onCreate={startCreate}
      />
    </div>
  );
}

function ConnectPage() {
  const { instanceId: routeId } = useParams();
  const instanceId = decodeURIComponent(routeId || "");
  const [qr, setQr] = useState("");
  const [status, setStatus] = useState("idle"); // idle|waiting|qr|connected|error
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [phone, setPhone] = useState("");
  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    wsRef.current = openWS(instanceId, {
      open: () => {},
      qr: (data) => {
        setQr(data);
        setStatus("qr");
        startTimer();
      },
      status: (msg) => {
        if (/ready|conectado|connected/i.test(msg || "")) {
          setStatus("connected");
        }
      },
      phone: (n) => {
        setPhone(n);
        setStatus("connected");
      },
    });
    return () => {
      wsRef.current && wsRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId]);

  const startTimer = () => {
    setSecondsLeft(45);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const startConnect = async () => {
    setStatus("waiting");
    setQr("");
    setPhone("");
    try {
      await api("/whatsapp/connect", {
        method: "POST",
        body: JSON.stringify({ instanceId }),
      });
      // se o backend disparar QR, cai no handler WS
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  };

  useEffect(() => {
    // inicia automaticamente
    startConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressPct = (secondsLeft / 45) * 100;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: 520,
          maxWidth: "90vw",
          padding: 24,
          borderRadius: 20,
          border: "1px solid #144",
          background: "#0b0b0b",
          boxShadow: "0 0 50px rgba(0,255,255,.2)",
          textAlign: "center",
        }}
      >
        <h2 style={{ marginTop: 6, color: "#4ef2f2" }}>Escaneie o QR Code</h2>

        {status === "error" && (
          <>
            <div style={{ margin: "12px 0", color: "#ffb" }}>
              Falha ao solicitar conexão. Tente novamente.
            </div>
            <button
              onClick={startConnect}
              style={{
                background: "#35f0f0",
                border: 0,
                borderRadius: 10,
                padding: "10px 12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Tentar novamente
            </button>
          </>
        )}

        {(status === "waiting" || status === "idle") && (
          <div
            style={{
              height: 280,
              display: "grid",
              placeItems: "center",
              opacity: 0.8,
            }}
          >
            Gerando QR Code...
          </div>
        )}

        {status === "qr" && !!qr && (
          <>
            <div
              style={{
                background: "#fff",
                display: "inline-block",
                padding: 16,
                borderRadius: 16,
                marginBottom: 16,
              }}
            >
              <QRCode value={qr} size={260} />
            </div>

            <div style={{ marginTop: 6, color: "#bbb", fontSize: 13 }}>
              Tempo restante <b>{secondsLeft}s</b>
            </div>
            <div
              style={{
                height: 6,
                background: "#141414",
                borderRadius: 999,
                overflow: "hidden",
                marginTop: 6,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  background:
                    progressPct > 66
                      ? "#35f0f0"
                      : progressPct > 33
                      ? "#ffd84d"
                      : "#ff6f6f",
                  transition: "width .3s",
                }}
              />
            </div>
            <div style={{ marginTop: 14, color: "#777", fontSize: 12 }}>
              Abra o WhatsApp no seu celular e escaneie o código
            </div>
          </>
        )}

        {status === "connected" && (
          <>
            <div
              style={{
                fontSize: 64,
                lineHeight: 1,
                marginTop: 10,
                color: "#7ef27e",
              }}
            >
              ✓
            </div>
            <h3 style={{ marginBottom: 8, color: "#7ef27e" }}>
              Conectado com sucesso!
            </h3>
            {phone && (
              <div style={{ color: "#ddd", marginBottom: 8 }}>
                Número: <b>{phone}</b>
              </div>
            )}
            <button
              onClick={() => nav("/")}
              style={{
                background: "#35f0f0",
                border: 0,
                borderRadius: 10,
                padding: "10px 12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Voltar ao Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// -------------------- APP --------------------
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/connect/:instanceId" element={<ConnectPage />} />
      </Routes>
    </Router>
  );
}
