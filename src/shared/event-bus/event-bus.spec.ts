import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EVENT_BUS, IEventBus } from './event-bus.interface';
import { EventBusModule } from './event-bus.module';
import { createIntegrationEvent, TIntegrationEvent } from './integration-event';
import { OnIntegrationEvent } from './on-integration-event.decorator';

@Injectable()
class TestHandler {
  readonly received: TIntegrationEvent[] = [];

  @OnIntegrationEvent('test.item.created')
  async onCreated(event: TIntegrationEvent): Promise<void> {
    this.received.push(event);
  }

  @OnIntegrationEvent('test.item.failed')
  async onFailed(): Promise<void> {
    throw new Error('handler failure');
  }
}

describe('EventBus', () => {
  let eventBus: IEventBus;
  let handler: TestHandler;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [EventBusModule],
      providers: [TestHandler],
    }).compile();
    moduleRef.useLogger(false);
    await moduleRef.init();
    eventBus = moduleRef.get(EVENT_BUS);
    handler = moduleRef.get(TestHandler);
  });

  it('delivers the event to subscribed handlers before publish resolves', async () => {
    const event = createIntegrationEvent('test.item.created', { id: '1' });
    await eventBus.publish(event);
    expect(handler.received).toEqual([event]);
  });

  it('does not propagate handler errors to the publisher', async () => {
    await expect(
      eventBus.publish(createIntegrationEvent('test.item.failed', {})),
    ).resolves.toBeUndefined();
  });
});
