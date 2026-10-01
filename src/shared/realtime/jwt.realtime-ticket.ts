import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import {
  IRealtimeTicketService,
  TRealtimeTicket,
  TRealtimeTicketPayload,
} from './realtime-ticket.interface';

/**
 * JWT (HS256) signed with a key derived from the access token secret, so a
 * ticket never verifies as an access token and vice versa. TTL from `auth` config.
 */
@Injectable()
export class JwtRealtimeTicketService implements IRealtimeTicketService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
  ) {}

  async issue(payload: TRealtimeTicketPayload): Promise<TRealtimeTicket> {
    const expiresIn = this.config.get('auth').realtimeTicketTtlSeconds;
    const ticket = await this.jwt.signAsync(
      { sub: payload.userId },
      { expiresIn },
    );
    return { ticket, expiresIn };
  }

  async verify(ticket: string): Promise<TRealtimeTicketPayload | null> {
    try {
      const claims = await this.jwt.verifyAsync<{ sub?: unknown }>(ticket);
      return typeof claims.sub === 'string' ? { userId: claims.sub } : null;
    } catch {
      // malformed, bad signature or expired
      return null;
    }
  }
}
