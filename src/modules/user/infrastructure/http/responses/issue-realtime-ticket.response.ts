export class IssueRealtimeTicketResponse {
  /** Pass as `auth.ticket` in the socket.io handshake. */
  ticket: string;
  /** Seconds the ticket stays usable to open a connection. */
  expiresIn: number;
}
