/** Event crossing module boundaries. Name format: `<module>.<entity>.<past-tense>`. */
export type TIntegrationEvent<
  TName extends string = string,
  TPayload = unknown,
> = {
  readonly name: TName;
  readonly occurredAt: string;
  readonly payload: TPayload;
};

export const createIntegrationEvent = <TName extends string, TPayload>(
  name: TName,
  payload: TPayload,
): TIntegrationEvent<TName, TPayload> => ({
  name,
  occurredAt: new Date().toISOString(),
  payload,
});
