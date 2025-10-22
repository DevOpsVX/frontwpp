// src/config/api.js
const API_BASE =
  (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || 'http://localhost:10000';

export const API_ENDPOINTS = {
  // Instâncias
  listInstances: () => `${API_BASE}/api/instances`,
  createInstance: () => `${API_BASE}/api/instances`,

  // Variante A (path) e B (query) para DELETE
  deleteInstancePath: (instanceName) =>
    `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}`,
  deleteInstanceQuery: (instanceName) =>
    `${API_BASE}/api/instances?instanceName=${encodeURIComponent(instanceName)}`,

  // Desconectar (mantém path e oferece fallback por query se precisar)
  disconnectPath: (instanceName) =>
    `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}/disconnect`,
  disconnectQuery: (instanceName) =>
    `${API_BASE}/api/instances/disconnect?instanceName=${encodeURIComponent(instanceName)}`,

  // QR (SSE ou long-polling do seu backend)
  qr: (instanceName) =>
    `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}/qr`,

  // GHL OAuth (principal e fallback)
  ghlLoginPrimary: (instanceName) =>
    `${API_BASE}/leadconnectorhq/oauth/login?instanceName=${encodeURIComponent(instanceName)}`,
  ghlLoginFallback: (instanceName) =>
    `${API_BASE}/leadconnectorhq/oauth/start?instanceName=${encodeURIComponent(instanceName)}`
};

/** Helpers básicos de fetch JSON */
export async function apiRequest(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ''}`);
  }
  // 204/205 não têm body
  if (res.status === 204 || res.status === 205) return null;
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

/** DELETE com fallback (path -> query) */
export async function deleteInstance(instanceName) {
  try {
    return await apiRequest(API_ENDPOINTS.deleteInstancePath(instanceName), {
      method: 'DELETE'
    });
  } catch (e) {
    // se rota path não existir, tenta query
    if (String(e.message).includes('HTTP 404')) {
      return apiRequest(API_ENDPOINTS.deleteInstanceQuery(instanceName), {
        method: 'DELETE'
      });
    }
    throw e;
  }
}

/** Desconectar com fallback (path -> query) */
export async function disconnectInstance(instanceName) {
  try {
    return await apiRequest(API_ENDPOINTS.disconnectPath(instanceName), {
      method: 'POST'
    });
  } catch (e) {
    if (String(e.message).includes('HTTP 404')) {
      return apiRequest(API_ENDPOINTS.disconnectQuery(instanceName), {
        method: 'POST'
      });
    }
    throw e;
  }
}

/** URL do login GHL com teste de reachability (login -> start) */
export async function resolveGhlLoginUrl(instanceName) {
  const primary = API_ENDPOINTS.ghlLoginPrimary(instanceName);
  try {
    // HEAD para não acionar o fluxo; só checa se a rota existe
    const r = await fetch(primary, { method: 'HEAD' });
    if (r.ok) return primary;
    // se 405/404 cai para fallback
  } catch (_) { /* ignora e usa fallback */ }
  return API_ENDPOINTS.ghlLoginFallback(instanceName);
}
