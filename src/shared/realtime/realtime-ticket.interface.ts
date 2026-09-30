export type TRealtimeTicket = {
  ticket: string;
  /** Seconds until the ticket can no longer open a connection. */
  expiresIn: number;
};

export type TRealtimeTicketPayload = {
  userId: string;
};

/**
 * Short-lived credential that only opens a realtime connection, for clients
 * that must not hold the access token (browser behind a BFF).
 * Not accepted as an access token, and vice versa.
 */
export interface IRealtimeTicketService {
  issue(payload: TRealtimeTicketPayload): Promise<TRealtimeTicket>;
  /** Payload of a valid ticket; null if malformed, tampered or expired. */
  verify(ticket: string): Promise<TRealtimeTicketPayload | null>;
}

export const REALTIME_TICKET_SERVICE = Symbol('REALTIME_TICKET_SERVICE');
