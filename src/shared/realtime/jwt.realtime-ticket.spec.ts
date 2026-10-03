import { JwtService } from '@nestjs/jwt';
import { IConfigService } from '@shared/config';
import { JwtRealtimeTicketService } from './jwt.realtime-ticket';

const config = {
  get: () => ({ realtimeTicketTtlSeconds: 30 }),
} as unknown as IConfigService;

const service = (secret: string) =>
  new JwtRealtimeTicketService(
    new JwtService({
      secret,
      signOptions: { algorithm: 'HS256' },
      verifyOptions: { algorithms: ['HS256'] },
    }),
    config,
  );

describe('JwtRealtimeTicketService', () => {
  it('issues a ticket that verifies back to its user', async () => {
    const tickets = service('ticket-secret');

    const issued = await tickets.issue({ userId: 'u1' });

    expect(issued.expiresIn).toBe(30);
    expect(await tickets.verify(issued.ticket)).toEqual({ userId: 'u1' });
  });

  it('rejects a token signed with another key (e.g. an access token)', async () => {
    const accessToken = await new JwtService({
      secret: 'access-secret',
    }).signAsync({ sub: 'u1' });

    expect(await service('ticket-secret').verify(accessToken)).toBeNull();
  });

  it('rejects an expired ticket', async () => {
    const expired = await new JwtService({ secret: 'ticket-secret' }).signAsync(
      { sub: 'u1' },
      { expiresIn: -1 },
    );

    expect(await service('ticket-secret').verify(expired)).toBeNull();
  });

  it('rejects garbage', async () => {
    expect(await service('ticket-secret').verify('nope')).toBeNull();
  });
});
