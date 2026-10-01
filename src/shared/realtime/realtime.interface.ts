/** Pushes events to connected clients. Best-effort: offline users get nothing. */
export interface IRealtimePublisher {
  /** Sends `event` to every open connection of `userId`. */
  emitToUser(userId: string, event: string, payload: unknown): void;
}

export const REALTIME_PUBLISHER = Symbol('REALTIME_PUBLISHER');

/**
 * Named groups of connections (e.g. "who has this chat window open").
 * A connection leaves every channel when it disconnects.
 */
export interface IRealtimeChannels {
  join(connectionId: string, channel: string): void;
  leave(connectionId: string, channel: string): void;
  /** At least one connection of `userId` is in `channel`. */
  hasUser(channel: string, userId: string): Promise<boolean>;
}

export const REALTIME_CHANNELS = Symbol('REALTIME_CHANNELS');
