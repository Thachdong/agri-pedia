---
name: hex-event-handler
description: Subscriber side of cross-module communication — a handler in src/modules/<module>/infrastructure/handlers/ that listens to another module's integration event with @OnIntegrationEvent and calls this module's own use case. Use when a module must react to an event published by another module.
---

# hex-event-handler

**Scope:** one handler class + provider registration + its test. **Out of scope:** the use case it calls (must exist — `hex-use-case`), the event contract (`hex-integration-event`).

## Rules
- Import from the publisher ONLY via `@modules/<publisher>/contracts`.
- Handler is a thin adapter: map payload → own use case input → `execute`. No business logic, no repository access.
- Idempotent: the called use case must tolerate the same event twice (e.g. check existing record by source id). If it doesn't, report it.
- Handler errors are caught and logged by `@OnIntegrationEvent`; they never reach the publisher. Do not add try/catch for that.
- Delivery is in-memory: events are lost if the process crashes. Mention this in the report when the reaction is business-critical.

## Template
```ts
// infrastructure/handlers/user-registered.handler.ts
import { Injectable } from '@nestjs/common';
import { OnIntegrationEvent } from '@shared/event-bus';
import { TUserRegisteredEvent, USER_REGISTERED_EVENT } from '@modules/user/contracts';

@Injectable()
export class UserRegisteredHandler {
  constructor(private readonly sendWelcomeEmail: SendWelcomeEmailUseCase) {}

  @OnIntegrationEvent(USER_REGISTERED_EVENT)
  async handle(event: TUserRegisteredEvent): Promise<void> {
    await this.sendWelcomeEmail.execute({ userId: event.payload.userId, email: event.payload.email });
  }
}
```
Register in `providers` of the subscribing module. No Nest `imports` of the publisher module is needed.

## Tests
`user-registered.handler.spec.ts`: call `handle(event)` with a stub use case; assert mapping of input.

## Steps
1. Handler. 2. Register provider. 3. Spec. 4. `npm run lint && npm test -- <module>`.

## Report
Event → handler → use case, idempotency note. Self-test: trigger the publisher (e.g. its endpoint) and check the log / side effect. Stop.
