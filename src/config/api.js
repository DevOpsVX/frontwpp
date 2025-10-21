export const API_BASE_URL = import.meta.env.VITE_API_URL;
export const WS_BASE_URL = import.meta.env.VITE_WS_URL;

export const API_ENDPOINTS = {
  INSTALLATIONS: "/api/installations",
  CREATE_INSTANCE: "/api/instances",
  DELETE_INSTANCE: (id) => `/api/instances/${encodeURIComponent(id)}`,
  CONNECT_WHATSAPP: "/whatsapp/connect",
};

export async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function createWebSocket(instanceId, handlers = {}) {
  const ws = new WebSocket(WS_BASE_URL);
  ws.onopen = () => ws.send(JSON.stringify({ type: "register", instanceId }));
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (handlers[msg.type]) handlers[msg.type](msg);
    } catch {}
  };
  return ws;
}
