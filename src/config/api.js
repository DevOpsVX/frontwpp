const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:10000';

async function http(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {}
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  }
  return data;
}

export const api = {
  listInstances: () => http('/api/instances'),
  createInstance: (instanceName) =>
    http('/api/instances', {
      method: 'POST',
      body: JSON.stringify({ instanceName }),
    }),
  openQrStream(instanceName, onEvent) {
    const url = `${API_BASE}/api/instances/${encodeURIComponent(instanceName)}/qr`;
    const es = new EventSource(url);
    es.onmessage = (e) => onEvent?.('message', e.data);
    es.addEventListener('qr', (e) => onEvent?.('qr', JSON.parse(e.data)));
    es.addEventListener('status', (e) => onEvent?.('status', JSON.parse(e.data)));
    es.addEventListener('error', (e) => onEvent?.('error', { message: 'SSE error' }));
    return es;
  },
  disconnect(instanceName) {
    return http(`/api/instances/${encodeURIComponent(instanceName)}/disconnect`, {
      method: 'POST',
    });
  },
};
