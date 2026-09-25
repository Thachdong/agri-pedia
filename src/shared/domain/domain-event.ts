/** Event raised inside an aggregate. Internal to the module that owns the aggregate. */
export type TDomainEvent<TName extends string = string, TPayload = unknown> = {
  readonly name: TName;
  readonly occurredAt: Date;
  readonly payload: TPayload;
};
