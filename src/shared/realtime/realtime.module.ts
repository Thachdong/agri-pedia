import { Global, Module } from '@nestjs/common';
import { REALTIME_PUBLISHER } from './realtime.interface';
import { SocketIoRealtimeGateway } from './socket-io.realtime';

@Global()
@Module({
  providers: [
    SocketIoRealtimeGateway,
    { provide: REALTIME_PUBLISHER, useExisting: SocketIoRealtimeGateway },
  ],
  exports: [REALTIME_PUBLISHER],
})
export class RealtimeModule {}
