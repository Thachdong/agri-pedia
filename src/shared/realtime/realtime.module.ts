import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import { JwtRealtimeTicketService } from './jwt.realtime-ticket';
import { REALTIME_TICKET_SERVICE } from './realtime-ticket.interface';
import { REALTIME_CHANNELS, REALTIME_PUBLISHER } from './realtime.interface';
import { SocketIoRealtimeGateway } from './socket-io.realtime';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [CONFIG_SERVICE, CRYPTO_SERVICE],
      useFactory: (config: IConfigService, crypto: ICryptoService) => ({
        secret: crypto.hash(
          `${config.get('auth').accessTokenSecret}:realtime-ticket`,
        ),
        signOptions: { algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  providers: [
    SocketIoRealtimeGateway,
    { provide: REALTIME_PUBLISHER, useExisting: SocketIoRealtimeGateway },
    { provide: REALTIME_CHANNELS, useExisting: SocketIoRealtimeGateway },
    { provide: REALTIME_TICKET_SERVICE, useClass: JwtRealtimeTicketService },
  ],
  exports: [REALTIME_PUBLISHER, REALTIME_CHANNELS, REALTIME_TICKET_SERVICE],
})
export class RealtimeModule {}
