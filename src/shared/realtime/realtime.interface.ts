/** Pushes events to connected clients. Best-effort: offline users get nothing. */
export interface IRealtimePublisher {
  /** Sends `event` to every open connection of `userId`. */
  emitToUser(userId: string, event: string, payload: unknown): void;
}

export const REALTIME_PUBLISHER = Symbol('REALTIME_PUBLISHER');
