import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import ConnectWhatsApp from "./ConnectWhatsApp";
import { apiRequest, API_ENDPOINTS } from "./config/api";

const GHL_OAUTH_CONFIG = {
  clientId: import.meta.env.VITE_GHL_CLIENT_ID,
  redirectUri: import.meta.env.VITE_GHL_REDIRECT_URI,
  authUrl: import.meta.env.VITE_GHL_AUTH_URL
};

function Dashboard() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.INSTALLATIONS);
      const mapped = (data || []).map((r) => ({
        id: r.instance_name,
        name: r.instance_name,
        status: r.access_token ? "connected" : "pending",
        phone: r.phone_number || null
      }));
      setItems(mapped);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const createAndOAuth = async () => {
    setError("");
    if (!/^[a-z0-9-]+$/.test(name)) {
      setError("nome inválido (minúsculas, números e hífen)");
      return;
    }
    try {
      await apiRequest(API_ENDPOINTS.CREATE_INSTANCE, {
        method: "POST",
        body: JSON.stringify({ name })
      });

      const state = btoa(JSON.stringify({ instanceName: name, t: Date.now() }));
      // escopos válidos e suficientes (evitar phone numbers)
      const scopes = [
        "conversations.readonly",
        "conversations.write",
        "contacts.readonly",
        "contacts.write",
        "oauth.readonly",
        "oauth.write"
      ].join(" ");

      const url =
        `${GHL_OAUTH_CONFIG.authUrl}?client_id=${encodeURIComponent(GHL_OAUTH_CONFIG.clientId)}` +
        `&redirect_uri=${encodeURIComponent(GHL_OAUTH_CONFIG.redirectUri)}` +
        `&response_type=code&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}`;

      window.location.href = url;
    } catch (e) {
      setError(e.message || "erro ao criar");
    }
  };

  const remove = async (id) => {
    if (!confirm("Excluir instância?")) return;
    try {
      await apiRequest(API_ENDPOINTS.DELETE_INSTANCE(id), { method: "DELETE" });
      await load();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Volxo — Gerenciador de Instâncias</h1>

        <div className="flex gap-2 mb-6">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="nome-da-instancia"
            className="flex-1 rounded-lg px-3 py-2 text-black"
          />
          <button
            onClick={createAndOAuth}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-black font-semibold"
          >
            Nova instância
          </button>
        </div>
        {error && <div className="text-red-400 mb-4">{error}</div>}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border border-cyan-500/30 p-4">
              <div className="font-semibold">{it.name}</div>
              <div className="text-sm text-gray-300">
                {it.status === "connected" ? "Conectado" : "Pendente"}
                {it.phone ? ` — ${it.phone}` : ""}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => navigate(`/connect/${encodeURIComponent(it.id)}`)}
                  className="px-3 py-2 rounded bg-cyan-600 text-black font-semibold"
                >
                  Conectar
                </button>
                <button
                  onClick={() => remove(it.id)}
                  className="px-3 py-2 rounded bg-red-600"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-gray-400">Nenhuma instância cadastrada.</div>
          )}
        </div>
      </div>
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
