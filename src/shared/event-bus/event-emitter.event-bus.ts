import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IEventBus } from './event-bus.interface';
import { TIntegrationEvent } from './integration-event';

@Injectable()
export class EventEmitterEventBus implements IEventBus {
  constructor(private readonly emitter: EventEmitter2) {}

  async publish(event: TIntegrationEvent): Promise<void> {
    await this.emitter.emitAsync(event.name, event);
  }

  async publishAll(events: TIntegrationEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
