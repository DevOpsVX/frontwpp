// src/config/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const WS_BASE_URL =
  import.meta.env.VITE_WS_URL || API_BASE_URL.replace(/^http/, "ws");

// Endpoints REST do backend
const API_ENDPOINTS = {
  INSTALLATIONS: `${API_BASE_URL}/api/installations`,
  CREATE_INSTANCE: `${API_BASE_URL}/api/instances`,
  DELETE_INSTANCE: (id) => `${API_BASE_URL}/api/instances/${id}`,
  CONNECT_WHATSAPP: `${API_BASE_URL}/whatsapp/connect`,
  RESTART_WHATSAPP: (id) => `${API_BASE_URL}/whatsapp/restart/${id}`,
};

async function apiRequest(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}

// WebSocket helper
function createWebSocket(instanceId, handlers = {}) {
  const ws = new WebSocket(`${WS_BASE_URL.replace(/^http/, "ws")}`);
  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({ type: "register", instanceId }));
    handlers.onOpen?.();
  });
  ws.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "qr") handlers.onQR?.(data.data);
      else if (data.type === "status") handlers.onStatus?.(data.message);
      else if (data.type === "phone") handlers.onPhone?.(data.number);
      else if (data.type === "registered") {
        // ok
      }
    } catch (e) {
      handlers.onError?.(e);
    }
  });
  ws.addEventListener("close", () => handlers.onClose?.());
  ws.addEventListener("error", (e) => handlers.onError?.(e));
  return ws;
}

export { API_BASE_URL, WS_BASE_URL, API_ENDPOINTS, apiRequest, createWebSocket };
