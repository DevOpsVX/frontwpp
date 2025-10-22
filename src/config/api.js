// src/config/api.js
const API_BASE =
  (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || 'http://localhost:10000';

export const API_ENDPOINTS = {
  // Instâncias
  listInstances: () => `${API_BASE}/api/instances`,
  createInstance: () => `${API_BASE}/api/instances`,

  // DELETE — suportar os 2 formatos do backend (path e query)
  deleteInstancePath: (instanceName) =>
    `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}`,
  deleteInstanceQuery: (instanceName) =>
    `${API_BASE}/api/instances?instanceName=${encodeURIComponent(instanceName)}`,

  // Desconectar — idem
  disconnectPath: (instanceName) =>
    `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}/disconnect`,
  disconnectQuery: (instanceName) =>
    `${API_BASE}/api/instances/disconnect?instanceName=${encodeURIComponent(instanceName)}`,

  // QR (mantemos como está)
  qr: (instanceName) =>
    `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}/qr`,

  // OAuth GHL — sempre COM instanceName
  ghlLoginPrimary: (instanceName) =>
    `${API_BASE}/leadconnectorhq/oauth/login?instanceName=${encodeURIComponent(instanceName)}`,
  ghlLoginFallback: (instanceName) =>
    `${API_BASE}/leadconnectorhq/oauth/start?instanceName=${encodeURIComponent(instanceName)}`,
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

// Reservar/criar a instância ANTES do OAuth (garante unicidade de instance_name)
export function reserveInstance(instanceName) {
  return apiRequest(API_ENDPOINTS.createInstance(), {
    method: 'POST',
    body: JSON.stringify({ instanceName }),
  });
}

// DELETE com fallback (path → query)
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

// Desconexão com fallback (path → query)
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

// Decide URL do OAuth (tenta /login; se HEAD falhar, usa /start)
export async function resolveGhlLoginUrl(instanceName) {
  const primary = API_ENDPOINTS.ghlLoginPrimary(instanceName);
  try {
    const r = await fetch(primary, { method: 'HEAD' });
    if (r.ok) return primary;
  } catch (_) {}
  return API_ENDPOINTS.ghlLoginFallback(instanceName);
}

// Stub para não quebrar o build na tela de QR (sem alterar seu comportamento atual)
export function createWebSocket(_instanceName) {
  return null;
}
