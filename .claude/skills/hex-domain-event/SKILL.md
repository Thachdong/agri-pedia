---
name: hex-domain-event
description: Add a domain event to an aggregate in src/modules/<module>/domain/events/ and make the aggregate record it via addEvent(). Module-internal only. Use when a state change must be observable; publishing to other modules is hex-integration-event.
---

# hex-domain-event

**Scope:** `domain/events/` + the `addEvent(...)` call inside the aggregate method + test. **Out of scope:** publishing on the event bus, handlers, contracts.

## Rules
- Pure TS, same import rules as `hex-domain-model`.
- Type = `TDomainEvent<Name, Payload>` from `@shared/domain`. Name: `'<Aggregate><PastTense>'` (e.g. `'UserRegistered'`).
- Payload holds primitives only (ids, strings, numbers, ISO dates) — no entities/VOs.
- Recorded in the aggregate method (or `create()`) that causes it, never in `restore()`.

## Template
```ts
// domain/events/user-registered.domain-event.ts
import { TDomainEvent } from '@shared/domain';

export const USER_REGISTERED = 'UserRegistered';

export type TUserRegisteredPayload = { userId: string; email: string };
export type TUserRegisteredDomainEvent = TDomainEvent<typeof USER_REGISTERED, TUserRegisteredPayload>;

export const userRegistered = (payload: TUserRegisteredPayload): TUserRegisteredDomainEvent => ({
  name: USER_REGISTERED,
  occurredAt: new Date(),
  payload,
});
```
In aggregate:
```ts
static create(input): User {
  const user = new User(randomUUID(), { ... });
  user.addEvent(userRegistered({ userId: user.id, email: user.email.value }));
  return user;
}
```

## Tests
Extend the aggregate spec: after the action, `pullEvents()` contains the event with expected payload; second `pullEvents()` is empty; `restore()` records nothing.

## Steps
1. Create event file, export from `domain/events/index.ts` and `domain/index.ts`. 2. Record in aggregate. 3. `npm run lint && npm test -- <module>/domain`.

## Report
Event name, payload, where it is recorded. Stop.
