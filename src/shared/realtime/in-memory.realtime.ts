import { IRealtimeChannels, IRealtimePublisher } from './realtime.interface';

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

/** Test fake: register connections with `connect(connectionId, userId)` first. */
export class InMemoryRealtimeChannels implements IRealtimeChannels {
  private readonly users = new Map<string, string>();
  private readonly members = new Map<string, Set<string>>();

  connect(connectionId: string, userId: string): void {
    this.users.set(connectionId, userId);
  }

  disconnect(connectionId: string): void {
    this.users.delete(connectionId);
    this.members.forEach((connections) => connections.delete(connectionId));
  }

  join(connectionId: string, channel: string): void {
    if (!this.users.has(connectionId)) {
      return;
    }
    const connections = this.members.get(channel) ?? new Set<string>();
    this.members.set(channel, connections.add(connectionId));
  }

  leave(connectionId: string, channel: string): void {
    this.members.get(channel)?.delete(connectionId);
  }

  async hasUser(channel: string, userId: string): Promise<boolean> {
    return [...(this.members.get(channel) ?? [])].some(
      (connectionId) => this.users.get(connectionId) === userId,
    );
  }
}
