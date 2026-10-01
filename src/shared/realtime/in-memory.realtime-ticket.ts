import {
  IRealtimeTicketService,
  TRealtimeTicket,
  TRealtimeTicketPayload,
} from './realtime-ticket.interface';

/** Test fake: readable ticket `ticket(<userId>)`, records every issued payload. */
export class InMemoryRealtimeTicketService implements IRealtimeTicketService {
  readonly issued: TRealtimeTicketPayload[] = [];

  async issue(payload: TRealtimeTicketPayload): Promise<TRealtimeTicket> {
    this.issued.push(payload);
    return { ticket: `ticket(${payload.userId})`, expiresIn: 30 };
  }

  async verify(ticket: string): Promise<TRealtimeTicketPayload | null> {
    const match = /^ticket\((.+)\)$/.exec(ticket);
    return match ? { userId: match[1] } : null;
  }
}
