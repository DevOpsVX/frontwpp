import React, { useEffect, useState } from "react";
import { API_ENDPOINTS, apiRequest } from "./config/api";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    setLoading(true);
    try {
      const data = await apiRequest(API_ENDPOINTS.instances());
      setInstances(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0b0f12", color: "#e6f7ff", padding: 24 }}>
      <h1 style={{ marginBottom: 12 }}>Volxo — Instâncias WhatsApp</h1>

      {loading && <p>Carregando…</p>}
      {error && (
        <div style={{ background: "#2a1b1b", padding: 12, borderRadius: 8, margin: "12px 0" }}>
          <b>Erro:</b> {error}
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
            Dica: confira se <code>VITE_API_BASE</code> está correto (Render &rarr; Environment) e
            se o backend está online.
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#00e5ff",
              color: "#001018",
              border: 0,
              padding: "10px 14px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Atualizar
          </button>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {instances.length === 0 && <div>Nenhuma instância.</div>}
            {instances.map((it) => (
              <div
                key={it.instance_name}
                style={{
                  background: "#0f151a",
                  border: "1px solid #1d2a33",
                  padding: 12,
                  borderRadius: 10,
                }}
              >
                <div style={{ fontWeight: 600 }}>{it.instance_name}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  instance_id: {it.instance_id || "—"} | phone: {it.phone_number || "—"}
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <button
                    onClick={() =>
                      (window.location.href = API_ENDPOINTS.ghlLogin(it.instance_name))
                    }
                    style={{
                      background: "#00e5ff",
                      color: "#001018",
                      border: 0,
                      padding: "8px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Login GHL
                  </button>

                  <button
                    onClick={() =>
                      (window.location.href = `/connect/${encodeURIComponent(it.instance_name)}`)
                    }
                    style={{
                      background: "#0088ff",
                      color: "#fff",
                      border: 0,
                      padding: "8px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Conectar WhatsApp
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
