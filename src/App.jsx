import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import ConnectWhatsApp from "./ConnectWhatsApp";
import { apiRequest, API_ENDPOINTS } from "./config/api";

function Dashboard() {
  const [instances, setInstances] = useState([]);
  const navigate = useNavigate();

  async function load() {
    try {
      const data = await apiRequest(API_ENDPOINTS.INSTALLATIONS);
      setInstances(data || []);
    } catch (e) {
      console.error(e);
    }
  }
  useEffect(() => { load(); }, []);

  async function createInstance() {
    const name = prompt("Nome da instância (minúsculas, números e hífens):");
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "");
    await apiRequest(API_ENDPOINTS.CREATE_INSTANCE, {
      method: "POST",
      body: JSON.stringify({ name: slug }),
    });

    // OAuth GHL com scope
    const state = btoa(JSON.stringify({ instanceName: slug, t: Date.now() }));
    const scopes = (import.meta.env.VITE_GHL_SCOPES ||
      "conversations.readonly conversations.write conversations/message.readonly conversations/message.write contacts.readonly contacts.write locations.readonly").trim();

    const url =
      `${import.meta.env.VITE_GHL_AUTH_URL}` +
      `?client_id=${encodeURIComponent(import.meta.env.VITE_GHL_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(import.meta.env.VITE_GHL_REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${encodeURIComponent(state)}`;

    window.location.href = url;
  }

  async function removeInstance(id) {
    if (!confirm("Excluir instância?")) return;
    await apiRequest(API_ENDPOINTS.DELETE_INSTANCE(id), { method: "DELETE" });
    load();
  }

  return (
    <div style={{ background: "#000", minHeight: "100vh", color: "#fff" }}>
      <header style={{ display: "flex", justifyContent: "space-between", padding: 16 }}>
        <h1 style={{ color: "#0ff" }}>VolxoWPP</h1>
        <button onClick={createInstance} style={{ background: "#0ff", border: "none", padding: "8px 14px", borderRadius: 10 }}>
          + Nova Instância
        </button>
      </header>

      <main style={{ display: "grid", gap: 16, padding: 16, gridTemplateColumns: "repeat(auto-fill, 260px)" }}>
        {instances.map((it) => (
          <div key={it.instance_id} style={{ background: "#0d1117", padding: 16, borderRadius: 12 }}>
            <h3 style={{ margin: "4px 0" }}>{it.instance_name || it.instance_id}</h3>
            <p style={{ color: "#a1a1aa", margin: "6px 0 14px" }}>
              {it.phone_number ? `📱 ${it.phone_number}` : "Aguardando conexão"}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => navigate(`/connect/${it.instance_id}`)}
                style={{ background: "#06b6d4", border: "none", padding: "8px 12px", borderRadius: 8 }}
              >
                Conectar
              </button>
              <button
                onClick={() => removeInstance(it.instance_id)}
                style={{ background: "#ef4444", border: "none", padding: "8px 12px", borderRadius: 8 }}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
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
