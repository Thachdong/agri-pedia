import { IRealtimePublisher } from './realtime.interface';

export type TEmittedRealtimeEvent = {
  userId: string;
  event: string;
  payload: unknown;
};

/** Test fake: records every emitted event. */
export class InMemoryRealtimePublisher implements IRealtimePublisher {
  readonly emitted: TEmittedRealtimeEvent[] = [];

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.emitted.push({ userId, event, payload });
  }
}
