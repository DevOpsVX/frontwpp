// API base robusto, com fallback e logs claros.
// Lê VITE_API_BASE do .env do frontend. Exemplo no Render: https://volxowppconect.onrender.com

const ENV_BASE = import.meta?.env?.VITE_API_BASE || "";
const API_BASE = (ENV_BASE || "").replace(/\/+$/, ""); // remove barra no final

if (!API_BASE) {
  // Não derruba o app; só avisa visualmente no console
  console.warn(
    "[api] VITE_API_BASE não definido. Configure em Settings > Environment do Render (frontend)."
  );
}

// Endpoints padronizados — casam com o backend que te passei
export const API_ENDPOINTS = {
  instances: () => `${API_BASE}/api/instances`,
  createInstance: () => `${API_BASE}/api/instances`,
  deleteInstance: (name) => `${API_BASE}/api/instances/${encodeURIComponent(name)}`,
  disconnectInstance: (name) => `${API_BASE}/api/instances/${encodeURIComponent(name)}/disconnect`,
  qr: (name) => `${API_BASE}/api/instances/${encodeURIComponent(name)}/qr`,
  ghlLogin: (name) =>
    `${API_BASE}/leadconnectorhq/oauth/login?instanceName=${encodeURIComponent(name)}`,
  ghlStart: (name) =>
    `${API_BASE}/leadconnectorhq/oauth/start?instanceName=${encodeURIComponent(name)}`, // fallback legacy
};

// Helper de fetch com mensagens amigáveis
export async function apiRequest(url, opts = {}) {
  try {
    const r = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      throw new Error(`HTTP ${r.status} – ${txt || r.statusText}`);
    }
    // algumas rotas devolvem 204
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    return await r.json();
  } catch (e) {
    console.error("[api] Erro", e);
    throw e;
  }
}
