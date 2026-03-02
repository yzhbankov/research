// Minimal typed event emitter for the pipeline engine

type Handler<T> = (data: T) => void;

export class EventEmitter<Events extends Record<string, unknown> = Record<string, unknown>> {
  private listeners = new Map<keyof Events, Set<Handler<never>>>();

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as Handler<never>);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(handler as Handler<never>);
    };
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        (handler as Handler<Events[K]>)(data);
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
