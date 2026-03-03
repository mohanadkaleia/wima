import { EventEmitter } from "events";

export interface SwarmEvent {
  type: string;
  timestamp: number;
  agentId?: string;
  payload: Record<string, unknown>;
}

class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  broadcast(event: SwarmEvent) {
    this.emit("event", event);
  }
}

export const eventBus = EventBus.getInstance();
