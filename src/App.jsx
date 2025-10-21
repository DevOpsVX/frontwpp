import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { apiRequest, API_ENDPOINTS } from "./config/api";
import ConnectWhatsApp from "./ConnectWhatsApp";

function Dashboard() {
  const [instances, setInstances] = useState([]);
  const navigate = useNavigate();

  async function load() {
    const data = await apiRequest(API_ENDPOINTS.INSTALLATIONS);
    setInstances(data || []);
  }

  useEffect(() => { load(); }, []);

  async function createInstance() {
    const name = prompt("Nome da instância:") || "";
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "");
    await apiRequest(API_ENDPOINTS.CREATE_INSTANCE, {
      method: "POST",
      body: JSON.stringify({ name: slug }),
    });

    const state = btoa(JSON.stringify({ instanceName: slug }));
    const scopes =
      import.meta.env.VITE_GHL_SCOPES ||
      "conversations.readonly conversations.write conversations/message.readonly conversations/message.write contacts.readonly contacts.write locations.readonly";

    const authUrl =
      `${import.meta.env.VITE_GHL_AUTH_URL}` +
      `?client_id=${encodeURIComponent(import.meta.env.VITE_GHL_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(import.meta.env.VITE_GHL_REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${encodeURIComponent(state)}`;

    window.location.href = authUrl;
  }

  async function del(id) {
    if (!confirm("Excluir instância?")) return;
    await apiRequest(API_ENDPOINTS.DELETE_INSTANCE(id), { method: "DELETE" });
    load();
  }

  return (
    <div style={bg}>
      <header style={header}>
        <h1 style={title}>VolxoWPP</h1>
        <button onClick={createInstance} style={btn}>
          + Nova Instância
        </button>
      </header>
      <main style={main}>
        {instances.map((i) => (
          <div key={i.instance_id} style={card}>
            <h3>{i.instance_name}</h3>
            <p>{i.phone_number || "Aguardando conexão"}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => navigate(`/connect/${i.instance_id}`)} style={btn2}>
                Conectar
              </button>
              <button onClick={() => del(i.instance_id)} style={delBtn}>
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

const bg = { background: "#000", minHeight: "100vh", color: "#fff" };
const header = { display: "flex", justifyContent: "space-between", padding: 20 };
const title = { color: "#0ff" };
const main = { display: "grid", gap: 20, padding: 20, gridTemplateColumns: "repeat(auto-fill, 250px)" };
const card = { background: "#0d1117", padding: 20, borderRadius: 10 };
const btn = { background: "#0ff", border: "none", padding: "10px 15px", borderRadius: 8, cursor: "pointer" };
const btn2 = { ...btn, background: "#06b6d4" };
const delBtn = { ...btn, background: "#ef4444" };
