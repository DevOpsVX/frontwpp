// src/config/api.js
const API_BASE =
  (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || 'http://localhost:10000';

export const API_ENDPOINTS = {
  listInstances: () => `${API_BASE}/api/instances`,
  createInstance: () => `${API_BASE}/api/instances`,
  disconnect: (instanceName) => `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}/disconnect`,
  qr: (instanceName) => `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}/qr`,
};

/**
 * Requisições HTTP padrão (JSON).
 */
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

  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data;
}

/**
 * WebSocket (na verdade SSE) para QR/Status.
 * Mantém o nome "createWebSocket" para compatibilidade com seu ConnectWhatsApp.jsx.
 * Retorna o EventSource e permite passar handlers opcionais.
 */
export function createWebSocket(urlOrInstanceName, handlers = {}) {
  const url = urlOrInstanceName.startsWith('http')
    ? urlOrInstanceName
    : API_ENDPOINTS.qr(urlOrInstanceName);

  const es = new EventSource(url);

  // Evento padrão (mensagem genérica)
  es.onmessage = (e) => handlers.onMessage?.(e.data);

  // Eventos nomeados que o backend envia
  es.addEventListener('qr', (e) => {
    try { handlers.onQr?.(JSON.parse(e.data)); } catch { handlers.onQr?.(e.data); }
  });

  es.addEventListener('status', (e) => {
    try { handlers.onStatus?.(JSON.parse(e.data)); } catch { handlers.onStatus?.(e.data); }
  });

  es.addEventListener('error', (e) => {
    handlers.onError?.(e);
  });

  return es;
}
