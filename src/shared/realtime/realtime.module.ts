import { Global, Module } from '@nestjs/common';
import { REALTIME_CHANNELS, REALTIME_PUBLISHER } from './realtime.interface';
import { SocketIoRealtimeGateway } from './socket-io.realtime';

@Global()
@Module({
  providers: [
    SocketIoRealtimeGateway,
    { provide: REALTIME_PUBLISHER, useExisting: SocketIoRealtimeGateway },
    { provide: REALTIME_CHANNELS, useExisting: SocketIoRealtimeGateway },
  ],
  exports: [REALTIME_PUBLISHER, REALTIME_CHANNELS],
})
export class RealtimeModule {}
