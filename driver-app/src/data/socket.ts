import { loadAuthTokenFromStorage } from './api';

type SocketCallback = (data: any) => void;

class SocketClientManager {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<SocketCallback>>();
  private connectionPromise: Promise<void> | null = null;
  
  // Reconnection & Offline buffering queue
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 10000;
  private reconnectTimer: any = null;
  
  // In-memory queue to hold telemetry coordinates if connection drops
  private offlineTelemetryQueue: any[] = [];

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
          console.log('Driver Socket connection established');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }

          // Connection recovered: flush queued offline telemetry frames
          this.flushOfflineQueue();

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
            // Non-JSON frames
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
          
          // Trigger reconnection loop
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
      console.warn('Max driver socket reconnection attempts reached. Halting auto-retry.');
      return;
    }

    if (this.reconnectTimer) return;

    this.reconnectAttempts++;
    console.log(`Scheduling driver socket reconnect attempt ${this.reconnectAttempts} in ${this.reconnectDelay}ms...`);
    this.triggerEvent('reconnect_attempt', { attempt: this.reconnectAttempts });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
        this.triggerEvent('reconnect', { attempt: this.reconnectAttempts });
      } catch {
        this.reconnectDelay = Math.min(this.maxReconnectDelay, this.reconnectDelay * 1.5);
        this.scheduleReconnection();
      }
    }, this.reconnectDelay);
  }

  private flushOfflineQueue(): void {
    if (this.offlineTelemetryQueue.length === 0) return;
    
    console.log(`Connection recovered! Flushing ${this.offlineTelemetryQueue.length} offline telemetry coordinate logs to server...`);
    
    while (this.offlineTelemetryQueue.length > 0) {
      const { event, data } = this.offlineTelemetryQueue.shift();
      this.emit(event, data);
    }
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
      // Offline handling: buffer telemetry updates in-memory instead of dropping them
      if (event === 'driver:update_location') {
        console.log(`Driver app offline. Telemetry coordinates queued in memory. Queue size: ${this.offlineTelemetryQueue.length + 1}`);
        this.offlineTelemetryQueue.push({ event, data });
      } else {
        console.warn(`Cannot emit event '${event}'. Socket is disconnected.`);
      }
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
