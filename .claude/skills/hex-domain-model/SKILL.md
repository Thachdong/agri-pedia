---
name: hex-domain-model
description: Create or change domain entities, aggregates, value objects and domain exceptions in src/modules/<module>/domain/, with unit tests for invariants. Pure TypeScript. Use for business rules/state of a module; not for persistence, use cases, events or HTTP.
---

# hex-domain-model

**Scope:** `domain/` of ONE module: entities, aggregate roots, value objects, domain exceptions, their unit tests. **Out of scope:** domain events (`hex-domain-event`), repository ports/use cases (`hex-use-case`), ORM, DTOs.

## Hard rules
- Imports allowed: other files in the same `domain/`, `@shared/domain`. Nothing else — no `@nestjs/*`, no `typeorm`, no `class-validator`, no other module.
- No decorators. No public setters. State changes via intention-revealing methods (`activate()`, `changeEmail()`).
- Invariants checked in factory and methods; violation → throw a `DomainException` subclass.
- Two factories on aggregates:
  - `static create(props)` — new instance, validates, generates id (`randomUUID` from `node:crypto` is allowed), may record events later.
  - `static restore(props)` — rebuild from persistence, no validation side effects, no events.
- Props typed with `T<Entity>Props`. Expose read-only getters.

## Layout
```
domain/
├── entities/<entity>.entity.ts
├── value-objects/<name>.vo.ts
├── exceptions/<reason>.exception.ts
├── enums/<name>.enum.ts          # E-prefixed
└── index.ts
```

## Templates
```ts
// exceptions/invalid-email.exception.ts
import { DomainException, EDomainErrorType } from '@shared/domain';

export class InvalidEmailException extends DomainException {
  constructor(value: string) {
    super('USER_INVALID_EMAIL', `Invalid email: ${value}`, EDomainErrorType.VALIDATION, { value });
  }
}
```
```ts
// value-objects/email.vo.ts
export class Email {
  private constructor(readonly value: string) {}

  static create(raw: string): Email {
    const value = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new InvalidEmailException(raw);
    return new Email(value);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
```
```ts
// entities/user.entity.ts
import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';

export type TUserProps = { email: Email; name: string; status: EUserStatus; createdAt: Date };

export class User extends AggregateRoot {
  private constructor(id: string, private props: TUserProps) {
    super(id);
  }

  static create(input: { email: Email; name: string }): User {
    return new User(randomUUID(), { ...input, status: EUserStatus.PENDING, createdAt: new Date() });
  }

  static restore(id: string, props: TUserProps): User {
    return new User(id, props);
  }

  get email(): Email { return this.props.email; }
  // ...getters, behaviour methods
}
```
Only aggregate roots extend `AggregateRoot`; child entities are plain classes owned by the root.

## Tests
`<entity>.entity.spec.ts` next to the file: each invariant (happy path + each exception), each behaviour method.

## Steps
1. Write/modify files. 2. Update `domain/index.ts`. 3. `npm run lint && npm test -- <module>/domain`.

## Report
Entities/VOs/exceptions (code + type) added, invariants covered, test result. Stop.
