import { TIntegrationEvent } from './integration-event';

export interface IEventBus {
  publish(event: TIntegrationEvent): Promise<void>;
  publishAll(events: TIntegrationEvent[]): Promise<void>;
}

export const EVENT_BUS = Symbol('EVENT_BUS');
