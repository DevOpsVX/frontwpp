// src/config/api.js
const API_BASE =
  (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") || "http://localhost:10000";

export const API_ENDPOINTS = {
  // Instâncias
  listInstances: ( ) => `${API_BASE}/api/instances`,
  createInstance: () => `${API_BASE}/api/instances`,
  deleteInstance: (instanceName) =>
    `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}`,
  disconnect: (instanceName) =>
    `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}/disconnect`,

  // QR Code (SSE)
  qr: (instanceName) =>
    `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}/qr`,

  // OAuth GHL
  ghlLogin: (instanceName) =>
    `${API_BASE}/leadconnectorhq/oauth/login?instanceName=${encodeURIComponent(instanceName)}`,
};

// Helper genérico para requisições
export async function apiRequest(url, opts = {}) {
  const defaultHeaders = { "Content-Type": "application/json" };
  const options = {
    ...opts,
    headers: { ...defaultHeaders, ...opts.headers },
  };

  // Se o body for um objeto, converte para JSON string
  if (options.body && typeof options.body === 'object') {
    options.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ""}`);
  }

  if (res.status === 204 || res.status === 205) return null;

  const contentType = res.headers.get("content-type") || "";
  return contentType.includes("application/json") ? res.json() : res.text();
}
