// src/config/api.js
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";
export const WS_BASE_URL  = import.meta.env.VITE_WS_URL  || "ws://localhost:10000";

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
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export function createWebSocket(instanceId, handlers = {}) {
  const ws = new WebSocket(WS_BASE_URL.replace(/^http/, "ws"));
  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({ type: "register", instanceId }));
    handlers.onOpen && handlers.onOpen();
  });
  ws.addEventListener("message", (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      switch (msg.type) {
        case "qr": handlers.onQR && handlers.onQR(msg.data); break;
        case "status": handlers.onStatus && handlers.onStatus(msg.message); break;
        case "phone": handlers.onPhone && handlers.onPhone(msg.number); break;
        case "profile": handlers.onProfile && handlers.onProfile(msg.url); break;
        case "registered":
          handlers.onRegistered && handlers.onRegistered();
          break;
      }
    } catch {}
  });
  ws.addEventListener("error", (e) => handlers.onError && handlers.onError(e));
  ws.addEventListener("close", () => handlers.onClose && handlers.onClose());
  return ws;
}
