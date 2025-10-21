export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";
export const WS_BASE_URL  = import.meta.env.VITE_WS_URL  || "ws://localhost:10000";

export const API_ENDPOINTS = {
  INSTALLATIONS: "/api/installations",
  CREATE_INSTANCE: "/api/instances",
  DELETE_INSTANCE: (id) => `/api/instances/${encodeURIComponent(id)}`,
  CONNECT_WHATSAPP: "/whatsapp/connect",
  RESTART_WHATSAPP: (id) => `/whatsapp/restart/${encodeURIComponent(id)}`
};

export async function apiRequest(path, opts = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      msg = j?.message || JSON.stringify(j);
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  try { return await res.json(); } catch { return null; }
}

export function createWebSocket(instanceId, handlers = {}) {
  const ws = new WebSocket(WS_BASE_URL.replace(/^http/, "ws"));
  ws.onopen = () => {
    handlers.onOpen?.();
    // registra a instância neste WS
    ws.send(JSON.stringify({ type: "register", instanceId }));
  };
  ws.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (data.type === "registered") handlers.onRegistered?.(data);
      if (data.type === "qr") handlers.onQR?.(data.data);
      if (data.type === "status") handlers.onStatus?.(data.message);
      if (data.type === "phone") handlers.onPhone?.(data.number);
    } catch (e) {
      handlers.onError?.(e);
    }
  };
  ws.onerror = (e) => handlers.onError?.(e);
  ws.onclose = () => handlers.onClose?.();
  return ws;
}
