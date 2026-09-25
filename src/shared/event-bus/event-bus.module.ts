import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EVENT_BUS } from './event-bus.interface';
import { EventEmitterEventBus } from './event-emitter.event-bus';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [{ provide: EVENT_BUS, useClass: EventEmitterEventBus }],
  exports: [EVENT_BUS],
})
export class EventBusModule {}
