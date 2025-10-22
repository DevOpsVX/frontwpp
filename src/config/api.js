// src/config/api.js
const API_BASE =
  (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || 'http://localhost:10000';

export const API_ENDPOINTS = {
  // Instâncias
  listInstances: () => `${API_BASE}/api/instances`,
  createInstance: () => `${API_BASE}/api/instances`,

  deleteInstancePath: (instanceName) =>
    `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}`,
  deleteInstanceQuery: (instanceName) =>
    `${API_BASE}/api/instances?instanceName=${encodeURIComponent(instanceName)}`,

  disconnectPath: (instanceName) =>
    `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}/disconnect`,
  disconnectQuery: (instanceName) =>
    `${API_BASE}/api/instances/disconnect?instanceName=${encodeURIComponent(instanceName)}`,

  // QR (mantido, para a etapa seguinte)
  qr: (instanceName) =>
    `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}/qr`,

  // OAuth GHL (principal + fallback; agora SEM instanceName)
  ghlLoginPrimary: () => `${API_BASE}/leadconnectorhq/oauth/login`,
  ghlLoginFallback: () => `${API_BASE}/leadconnectorhq/oauth/start`,
};

// --------- helpers ---------
export async function apiRequest(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ''}`);
  }
  if (res.status === 204 || res.status === 205) return null;
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

// DELETE com fallback
export async function deleteInstance(instanceName) {
  try {
    return await apiRequest(API_ENDPOINTS.deleteInstancePath(instanceName), {
      method: 'DELETE',
    });
  } catch (e) {
    if (String(e.message).includes('HTTP 404')) {
      return apiRequest(API_ENDPOINTS.deleteInstanceQuery(instanceName), {
        method: 'DELETE',
      });
    }
    throw e;
  }
}

// Desconectar com fallback
export async function disconnectInstance(instanceName) {
  try {
    return await apiRequest(API_ENDPOINTS.disconnectPath(instanceName), {
      method: 'POST',
    });
  } catch (e) {
    if (String(e.message).includes('HTTP 404')) {
      return apiRequest(API_ENDPOINTS.disconnectQuery(instanceName), {
        method: 'POST',
      });
    }
    throw e;
  }
}

// Decide a rota de login do GHL (login -> start)
export async function resolveGhlLoginUrl() {
  const primary = API_ENDPOINTS.ghlLoginPrimary();
  try {
    const r = await fetch(primary, { method: 'HEAD' });
    if (r.ok) return primary;
  } catch (_) {}
  return API_ENDPOINTS.ghlLoginFallback();
}

// Export “createWebSocket” só para sanar o erro de build do ConnectWhatsApp.
// (Quando formos mexer na parte do QR, apontamos para o endpoint real de WS.)
export function createWebSocket(_instanceName) {
  // Placeholder (não quebra o build e não é usado no fluxo atual)
  return null;
}
