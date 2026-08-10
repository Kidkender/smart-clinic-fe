const TOKEN_KEY = 'smartclinic_token';
const MAX_BACKOFF_MS = 15000;
const BASE_BACKOFF_MS = 1000;

export interface RealtimeEnvelope<T = unknown> {
  type: string;
  data: T;
}

type Listener = (envelope: RealtimeEnvelope) => void;

function wsUrl(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const httpUrl = new URL(`${apiUrl}/api/v1/ws`);
  httpUrl.protocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  httpUrl.searchParams.set('token', token);
  return httpUrl.toString();
}

class RealtimeClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosed = false;

  connect() {
    if (this.socket) return;
    const url = wsUrl();
    if (!url) return;

    this.manuallyClosed = false;
    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempt = 0;
    };
    socket.onmessage = event => {
      try {
        const envelope = JSON.parse(event.data) as RealtimeEnvelope;
        this.listeners.forEach(listener => listener(envelope));
      } catch {
        // Ignore malformed frames rather than crashing the socket handler.
      }
    };
    socket.onclose = () => {
      this.socket = null;
      if (!this.manuallyClosed) this.scheduleReconnect();
    };
    socket.onerror = () => {
      socket.close();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(BASE_BACKOFF_MS * 2 ** this.reconnectAttempt, MAX_BACKOFF_MS);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  disconnect() {
    this.manuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    this.connect();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.disconnect();
    };
  }
}

export const realtimeClient = new RealtimeClient();

window.addEventListener('auth:logout', () => realtimeClient.disconnect());
