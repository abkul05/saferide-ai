import { loadAuthTokenFromStorage } from './api';

type SocketCallback = (data: any) => void;

class SocketClientManager {
  private socketUrl = 'ws://localhost:5000/rides';
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<SocketCallback>>();
  private connectionPromise: Promise<void> | null = null;

  public async connect(): Promise<void> {
    if (this.ws) return;
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        const token = await loadAuthTokenFromStorage();
        if (!token) {
          throw new Error('JWT token missing. Cannot connect to sockets.');
        }

        // Establish connection with JWT query parameters
        const urlWithAuth = `ws://localhost:5000/?token=${token}`;
        this.ws = new WebSocket(urlWithAuth);

        this.ws.onopen = () => {
          console.log('SafeRide Socket connection established');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            // Simple parsing of incoming custom socket frames or json frames
            const payload = JSON.parse(event.data);
            const { type, data } = payload;
            
            if (type && this.listeners.has(type)) {
              this.listeners.get(type)?.forEach((cb) => cb(data));
            }
          } catch {
            // Non-JSON frame (e.g. ping/pong)
          }
        };

        this.ws.onerror = (error) => {
          console.warn('Socket connection error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('Socket connection closed');
          this.ws = null;
          this.connectionPromise = null;
        };
      } catch (err) {
        this.connectionPromise = null;
        reject(err);
      }
    });

    return this.connectionPromise;
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connectionPromise = null;
    }
  }
}

export const socketClient = new SocketClientManager();
