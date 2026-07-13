import { loadAuthTokenFromStorage } from './api';

type SocketCallback = (data: any) => void;

class SocketClientManager {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<SocketCallback>>();
  private connectionPromise: Promise<void> | null = null;
  
  // Reconnection & Recovery parameters
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private reconnectDelay = 1000; // ms
  private maxReconnectDelay = 10000; // ms
  private reconnectTimer: any = null;

  public async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }
    
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        const token = await loadAuthTokenFromStorage();
        if (!token) {
          throw new Error('JWT token missing. Cannot connect to sockets.');
        }

        const urlWithAuth = `ws://localhost:5000/?token=${token}`;
        this.ws = new WebSocket(urlWithAuth);

        this.ws.onopen = () => {
          console.log('SafeRide Socket connection established');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }

          // Trigger custom connection events
          this.triggerEvent('connect', { connected: true });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            const { type, data } = payload;
            
            if (type && this.listeners.has(type)) {
              this.listeners.get(type)?.forEach((cb) => cb(data));
            }
          } catch {
            // Non-JSON frame
          }
        };

        this.ws.onerror = (error) => {
          console.warn('Socket connection error:', error);
          this.triggerEvent('connect_error', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('Socket connection closed');
          this.ws = null;
          this.isConnected = false;
          this.connectionPromise = null;
          
          this.triggerEvent('disconnect', { disconnected: true });
          
          // Initiate automatic reconnection schedule
          this.scheduleReconnection();
        };
      } catch (err) {
        this.connectionPromise = null;
        this.triggerEvent('connect_error', err);
        reject(err);
      }
    });

    return this.connectionPromise;
  }

  private scheduleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max socket reconnection attempts reached. Halting auto-retry.');
      return;
    }

    if (this.reconnectTimer) return;

    this.reconnectAttempts++;
    console.log(`Scheduling socket reconnect attempt ${this.reconnectAttempts} in ${this.reconnectDelay}ms...`);
    this.triggerEvent('reconnect_attempt', { attempt: this.reconnectAttempts });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
        this.triggerEvent('reconnect', { attempt: this.reconnectAttempts });
      } catch {
        // Backoff increase
        this.reconnectDelay = Math.min(this.maxReconnectDelay, this.reconnectDelay * 1.5);
        this.scheduleReconnection();
      }
    }, this.reconnectDelay);
  }

  private triggerEvent(type: string, data: any): void {
    if (this.listeners.has(type)) {
      this.listeners.get(type)?.forEach((cb) => cb(data));
    }
  }

  public on(event: string, callback: SocketCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  public off(event: string, callback: SocketCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  public emit(event: string, data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: event, data }));
    } else {
      console.warn(`Cannot emit event '${event}'. Socket is disconnected.`);
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.connectionPromise = null;
    }
  }
}

export const socketClient = new SocketClientManager();
export default socketClient;
