/**
 * Configuração da API do Backend
 * 
 * URL Base: https://volxowppconect.onrender.com
 * WebSocket: wss://volxowppconect.onrender.com
 */

// URL base da API (backend no Render)
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://volxowppconect.onrender.com';

// URL do WebSocket
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'wss://volxowppconect.onrender.com';

// Endpoints da API
export const API_ENDPOINTS = {
  // Instâncias
  INSTALLATIONS: '/api/installations',
  CREATE_INSTANCE: '/api/instances',
  DELETE_INSTANCE: (instanceId) => `/api/instances/${instanceId}`,
  UPDATE_INSTANCE: (instanceId) => `/api/instances/${instanceId}`,
  
  // WhatsApp
  CONNECT_WHATSAPP: '/whatsapp/connect',
  DISCONNECT_WHATSAPP: (instanceId) => `/whatsapp/disconnect/${instanceId}`,
  RESTART_WHATSAPP: (instanceId) => `/whatsapp/restart/${instanceId}`,
};

/**
 * Helper para fazer requisições HTTP
 */
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
      throw new Error(error.message || `Erro ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro na requisição:', error);
    throw error;
  }
};

/**
 * Helper para criar conexão WebSocket
 */
export const createWebSocket = (instanceId, callbacks = {}) => {
  const ws = new WebSocket(WS_BASE_URL);

  ws.onopen = () => {
    console.log('WebSocket conectado');
    
    // Registrar a instância
    ws.send(JSON.stringify({
      type: 'register',
      instanceId: instanceId
    }));

    if (callbacks.onOpen) callbacks.onOpen();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Mensagem recebida:', data);

      // Processar diferentes tipos de mensagem
      switch (data.type) {
        case 'qr':
          if (callbacks.onQR) callbacks.onQR(data.data);
          break;
        case 'status':
          if (callbacks.onStatus) callbacks.onStatus(data.message);
          break;
        case 'phone':
          if (callbacks.onPhone) callbacks.onPhone(data.number);
          break;
        default:
          console.warn('Tipo de mensagem desconhecido:', data.type);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('Erro no WebSocket:', error);
    if (callbacks.onError) callbacks.onError(error);
  };

  ws.onclose = () => {
    console.log('WebSocket desconectado');
    if (callbacks.onClose) callbacks.onClose();
  };

  return ws;
};

