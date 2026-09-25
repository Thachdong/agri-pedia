---
name: hex-use-case
description: Create one application use case in src/modules/<module>/application/use-cases/ with its input/output types, the outbound ports it needs (I<X>Repository + DI token + in-memory fake), provider registration, and unit tests with fakes. Use for any application action (command or query) of a module.
---

# hex-use-case

**Scope:** ONE use case + the outbound port(s) it needs + fakes + unit test + provider registration. **Out of scope:** port implementations (`hex-persistence-adapter`), controllers (`hex-http-adapter`), integration events (`hex-integration-event`), domain changes (`hex-domain-model`).

If the use case needs a domain change that does not exist, stop and report — do not edit `domain/`.

## Rules
- One class = one action, method `execute(input)`. Name `<Verb><Noun>UseCase`.
- Input/output are plain types `T<Action>Input` / `T<Action>Output` (primitives, no entities leak out).
- Depends on: own `domain/`, own `application/ports/`, `@shared/database` (`IUnitOfWork`), `@shared/event-bus` (`IEventBus`), other modules' `contracts/` only. Inject by token, type by interface.
- Writes run inside `unitOfWork.runInTransaction(...)`.
- Business errors: throw `DomainException` subclasses. Missing domain exception (e.g. not-found) → add to `domain/exceptions/` (only exception files may be added here).
- No HTTP concepts (status codes, request objects), no TypeORM.

## Port template
```ts
// application/ports/user.repository.ts
import { User } from '../../domain';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
```
Port methods speak domain language (aggregates, VOs) — never ORM entities or query builders. Add only methods the use case needs.

Fake: `application/ports/fakes/in-memory-user.repository.ts` implementing the interface with a `Map`.

## Use case template
```ts
// application/use-cases/register-user.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';

export type TRegisterUserInput = { email: string; name: string };
export type TRegisterUserOutput = { userId: string };

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TRegisterUserInput): Promise<TRegisterUserOutput> {
    const email = Email.create(input.email);
    const user = await this.unitOfWork.runInTransaction(async () => {
      if (await this.users.findByEmail(email.value)) throw new EmailAlreadyUsedException(email.value);
      const created = User.create({ email, name: input.name });
      await this.users.save(created);
      return created;
    });
    return { userId: user.id };
  }
}
```

## Module wiring
Add use case to `providers` of `<module>.module.ts`. Do NOT bind the repository token here if no adapter exists yet — note it in the report (the persistence step binds it).

## Tests
`register-user.use-case.spec.ts` next to it. Construct directly: `new RegisterUserUseCase(new InMemoryUserRepository(), new InMemoryUnitOfWork())`. Cover happy path + every exception path.

## Steps
1. Ports + fakes. 2. Use case + types. 3. Barrels (`application/ports/index.ts`, `application/use-cases/index.ts`). 4. Register provider. 5. `npm run lint && npm test -- <module>/application`.

## Report
Use case signature, ports + methods (and "binding pending" if no adapter), exceptions thrown, test result. Stop.
