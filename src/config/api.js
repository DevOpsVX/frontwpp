// src/config/api.js
const API_BASE =
  (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || 'http://localhost:10000';

// Endpoints padronizados do backend
export const API_ENDPOINTS = {
  listInstances: () => `${API_BASE}/api/instances`,
  createInstance: () => `${API_BASE}/api/instances`,
  deleteInstance: (instanceName) =>
    `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}`, // DELETE
  disconnect: (instanceName) =>
    `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}/disconnect`, // POST
  // fluxo GHL: o back começa o OAuth e depois redireciona pro GHL
  oauthStart: (instanceName) =>
    `${API_BASE}/leadconnectorhq/oauth/start?instanceName=${encodeURIComponent(instanceName)}`,
  // stream SSE de QR/Status
  qr: (instanceName) =>
    `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}/qr`,
};

// fetch JSON “seguro”
export async function apiRequest(pathOrUrl, { method = 'GET', body, headers } = {}) {
  const url = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `${API_BASE}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch (_) {}

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// “WebSocket” compatível via SSE (EventSource)
export function createWebSocket(urlOrInstanceName, handlers = {}) {
  const url = urlOrInstanceName.startsWith('http')
    ? urlOrInstanceName
    : API_ENDPOINTS.qr(urlOrInstanceName);

  const es = new EventSource(url);

  es.onmessage = (e) => handlers.onMessage?.(e.data);

  es.addEventListener('qr', (e) => {
    try { handlers.onQr?.(JSON.parse(e.data)); } catch { handlers.onQr?.(e.data); }
  });

  es.addEventListener('status', (e) => {
    try { handlers.onStatus?.(JSON.parse(e.data)); } catch { handlers.onStatus?.(e.data); }
  });

  es.addEventListener('error', (e) => handlers.onError?.(e));

  return es;
}
