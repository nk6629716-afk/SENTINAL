import { EventEmitter } from 'events';
import { RealtimeEvent, RealtimeEventType } from '../../../shared/types';

class SentinelEventBus extends EventEmitter {
  public publish<T = unknown>(type: RealtimeEventType, payload: T): void {
    const event: RealtimeEvent<T> = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.emit('event', event);
    this.emit(type, event);
  }

  public subscribe(listener: (event: RealtimeEvent) => void): () => void {
    this.on('event', listener);
    return () => {
      this.off('event', listener);
    };
  }
}

export const eventBus = new SentinelEventBus();
