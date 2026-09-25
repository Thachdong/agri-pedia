import { TDomainEvent } from './domain-event';

export abstract class AggregateRoot<TId = string> {
  private domainEvents: TDomainEvent[] = [];

  protected constructor(readonly id: TId) {}

  protected addEvent(event: TDomainEvent): void {
    this.domainEvents.push(event);
  }

  /** Returns recorded events and clears them. Call once, after the aggregate is persisted. */
  pullEvents(): TDomainEvent[] {
    const events = this.domainEvents;
    this.domainEvents = [];
    return events;
  }
}
