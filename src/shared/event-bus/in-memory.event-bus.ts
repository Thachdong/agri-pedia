import { IEventBus } from './event-bus.interface';
import { TIntegrationEvent } from './integration-event';

/** Test fake: records published events. */
export class InMemoryEventBus implements IEventBus {
  readonly published: TIntegrationEvent[] = [];

  async publish(event: TIntegrationEvent): Promise<void> {
    this.published.push(event);
  }

  async publishAll(events: TIntegrationEvent[]): Promise<void> {
    this.published.push(...events);
  }
}
