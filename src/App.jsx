// src/App.jsx
import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import ConnectWhatsApp from "./ConnectWhatsApp";
import { apiRequest, API_ENDPOINTS } from "./config/api";
import logo from "./logo-volxo.png";

function Dashboard() {
  const [instances, setInstances] = useState([]);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();

  async function load() {
    try {
      const data = await apiRequest(API_ENDPOINTS.INSTALLATIONS);
      const mapped = (data || []).map((r) => ({
        id: r.instance_id,
        name: r.instance_name || r.instance_id,
        phone: r.phone_number || "",
        status: r.phone_number ? "connected" : "pending",
      }));
      setInstances(mapped);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => { load(); }, []);

  async function createInstance() {
    const name = prompt("Nome da instância (minúsculas, números e hífens):") || "";
    if (!name.trim()) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "");
    await apiRequest(API_ENDPOINTS.CREATE_INSTANCE, {
      method: "POST",
      body: JSON.stringify({ name: slug }),
    });
    // abre OAuth (state carrega instanceName)
    const state = btoa(JSON.stringify({ instanceName: slug, t: Date.now() }));
    const authUrl =
      `${import.meta.env.VITE_GHL_AUTH_URL}?client_id=${encodeURIComponent(import.meta.env.VITE_GHL_CLIENT_ID)}&redirect_uri=${encodeURIComponent(import.meta.env.VITE_GHL_REDIRECT_URI)}&response_type=code&state=${encodeURIComponent(state)}`;
    window.location.href = authUrl;
  }

  async function del(id) {
    if (!confirm("Excluir esta instância?")) return;
    await apiRequest(API_ENDPOINTS.DELETE_INSTANCE(id), { method: "DELETE" });
    load();
  }

  const filtered = instances.filter((i) =>
    (i.name || i.id).toLowerCase().includes(term.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0b0f12" }}>
      <header
        style={{
          borderBottom: "1px solid #1f2937",
          background: "#0d1117",
          padding: 16,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={logo} alt="Volxo" style={{ width: 40, height: 40 }} />
          <div>
            <div style={{ color: "#0ff", fontWeight: 800, fontSize: 20 }}>Volxo</div>
            <div style={{ color: "#9ca3af", fontSize: 12 }}>Gerenciador de Instâncias WhatsApp</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              onClick={createInstance}
              style={{
                background: "#06b6d4",
                color: "#001014",
                border: "none",
                padding: "10px 14px",
                borderRadius: 10,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + Nova Instância
            </button>
          </div>
        </div>
      </header>

      <main style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
        <input
          placeholder="Pesquisar instâncias..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            background: "#0d1117",
            border: "1px solid #1f2937",
            borderRadius: 12,
            color: "#e5e7eb",
            marginBottom: 16,
          }}
        />

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          }}
        >
          {filtered.map((i) => (
            <div
              key={i.id}
              style={{
                background: "#0d1117",
                border: "1px solid #1f2937",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700 }}>{i.name}</div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>{i.id}</div>
                  {i.phone && (
                    <div style={{ color: "#9ca3af", marginTop: 6 }}>📱 {i.phone}</div>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: i.status === "connected" ? "#10b981" : "#f59e0b",
                  }}
                >
                  {i.status === "connected" ? "Conectado" : "Pendente"}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => navigate(`/connect/${encodeURIComponent(i.id)}`)}
                  style={{
                    flex: 1,
                    background: "#06b6d4",
                    color: "#001014",
                    border: "none",
                    padding: "10px 14px",
                    borderRadius: 10,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  🧾 Conectar
                </button>
                <button
                  onClick={() => del(i.id)}
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    padding: "10px 12px",
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/connect/:instanceId" element={<ConnectWhatsApp />} />
      </Routes>
    </Router>
  );
}
