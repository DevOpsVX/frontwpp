// src/config/api.js
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || "ws://localhost:10000";

export const API_ENDPOINTS = {
  INSTALLATIONS: "/api/installations",
  CREATE_INSTANCE: "/api/instances",
  DELETE_INSTANCE: (id) => `/api/instances/${encodeURIComponent(id)}`,
  CONNECT_WHATSAPP: "/whatsapp/connect",
};

export async function apiRequest(path, opts = {}) {
  const url = `${API_BASE_URL.replace(/\/$/, "")}${path}`;
  const resp = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || resp.statusText);
  }
  return resp.json().catch(() => ({}));
}

// Guard de registro por página/instância
const wsRegistry = new Map(); // key = instanceId -> boolean

export function createWebSocket(instanceId, handlers = {}) {
  if (!instanceId) throw new Error("instanceId obrigatório");
  if (wsRegistry.get(instanceId)) return null; // já registrado
  wsRegistry.set(instanceId, true);

  const wsUrl = `${WS_BASE_URL.replace(/^http/, "ws").replace(/\/$/, "")}`;
  const ws = new WebSocket(wsUrl);

  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({ type: "register", instanceId }));
    handlers.onOpen && handlers.onOpen();
  });

  ws.addEventListener("message", (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (data?.type === "qr" && handlers.onQR) handlers.onQR(data.data);
      if (data?.type === "status" && handlers.onStatus) handlers.onStatus(data.message);
      if (data?.type === "phone" && handlers.onPhone) handlers.onPhone(data.number);
      if (data?.type === "registered" && handlers.onRegistered) handlers.onRegistered();
    } catch {}
  });

  ws.addEventListener("error", (e) => handlers.onError && handlers.onError(e));
  ws.addEventListener("close", () => handlers.onClose && handlers.onClose());

  return ws;
}
