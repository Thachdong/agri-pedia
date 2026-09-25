---
name: hex-integration-event
description: Publisher side of cross-module communication — define an integration event (name + payload) in src/modules/<module>/contracts/events/ and publish it through IEventBus from a use case after its transaction commits. Use when another module must react to something this module did.
---

# hex-integration-event

**Scope:** `contracts/events/` of the publishing module + the publish call in ONE use case + its test. **Out of scope:** subscribers (`hex-event-handler`), domain event definition (`hex-domain-event`).

## Rules
- Name: `'<module>.<entity>.<past-tense>'` (e.g. `'user.account.registered'`). Constant `<ENTITY>_<PAST>_EVENT`.
- Payload = public contract: primitives/ISO strings only, only fields consumers need, no internal enums from `domain/` (redeclare as string union in contracts if needed). Changing it later is a breaking change for subscribers.
- `contracts/` imports only `@shared/event-bus` types — never this module's `domain/`.
- Publish **after** `runInTransaction` resolves, never inside it.
- If the aggregate records a matching domain event, derive the integration event from `aggregate.pullEvents()`; otherwise build it from use case data.

## Template
```ts
// contracts/events/user-registered.event.ts
import { TIntegrationEvent } from '@shared/event-bus';

export const USER_REGISTERED_EVENT = 'user.account.registered';

export type TUserRegisteredEventPayload = { userId: string; email: string; name: string };
export type TUserRegisteredEvent = TIntegrationEvent<typeof USER_REGISTERED_EVENT, TUserRegisteredEventPayload>;
```
In the use case:
```ts
constructor(
  // ...existing deps
  @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
) {}

async execute(input) {
  const user = await this.unitOfWork.runInTransaction(async () => { /* ... save ... */ return created; });

  await this.eventBus.publish(
    createIntegrationEvent(USER_REGISTERED_EVENT, { userId: user.id, email: user.email.value, name: user.name }),
  );
  return { userId: user.id };
}
```

## Tests
Update the use case spec: inject `InMemoryEventBus`; assert `published` contains the event with expected name/payload on success, and is empty when the use case throws.

## Steps
1. Event file + `contracts/events/index.ts` export. 2. Publish in use case. 3. Update spec. 4. `npm run lint && npm test -- <module>`.

## Report
Event name, payload fields, publishing use case. Stop.
