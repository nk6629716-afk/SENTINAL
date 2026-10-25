import { Request, Response } from 'express';
import { eventBus } from './eventBus';
import { RealtimeEvent } from '../../../shared/types';
import { config } from '../config';

class SseManager {
  private clients: Set<Response> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
    eventBus.subscribe((event) => {
      this.broadcast(event);
    });
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      this.sendToAll({
        type: 'ping',
        timestamp: new Date().toISOString(),
      });
    }, config.sseHeartbeatIntervalMs);
    this.heartbeatInterval.unref();
  }

  public handleConnection(req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders?.();

    this.clients.add(res);

    // Send initial connected event
    const initEvent = {
      type: 'connected',
      message: 'SENTINEL Realtime Event Stream Active',
      timestamp: new Date().toISOString(),
      clientCount: this.clients.size,
    };
    res.write(`data: ${JSON.stringify(initEvent)}\n\n`);

    req.on('close', () => {
      this.clients.delete(res);
    });
  }

  public broadcast(event: RealtimeEvent): void {
    this.sendToAll(event);
  }

  private sendToAll(data: unknown): void {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  public getConnectedClientCount(): number {
    return this.clients.size;
  }
}

export const sseManager = new SseManager();
