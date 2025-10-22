// src/api.js
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

async function j(method, url, body) {
  const r = await fetch(`${API_URL}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    let data;
    try { data = JSON.parse(text); } catch { data = { message: text || r.statusText }; }
    throw Object.assign(new Error(data.message || 'Erro de rede'), { status: r.status, data });
  }
  return r.status === 204 ? null : r.json();
}

export const api = {
  // Lista as instalações do Supabase (via backend)
  listInstances() {
    return j('GET', '/api/instances');
  },
  // Cria registro local (somente nome) e devolve instance_name
  createInstance(instance_name) {
    return j('POST', '/api/instances', { instance_name });
  },
  // Vincula tokens após OAuth (backend faz, front só navega)
  // Dispara conexão do WPP (gera QR assim que o WS entregar)
  startWpp(instance_name) {
    return j('POST', '/api/instances/connect', { instance_name });
  },
  // Pede “desconectar” e remove sessão
  disconnect(instance_name) {
    return j('POST', '/api/instances/disconnect', { instance_name });
  },
  // Dados de status (profile, phone, conectado etc.)
  getStatus(instance_name) {
    return j('GET', `/api/instances/${encodeURIComponent(instance_name)}/status`);
  },
};
