---
name: hex-http-adapter
description: Inbound HTTP adapter — controller + request DTOs (class-validator) in src/modules/<module>/infrastructure/http/ that map requests to an existing use case, plus an e2e test. Use to expose a use case as a REST endpoint.
---

# hex-http-adapter

**Scope:** `infrastructure/http/` (controller, DTOs, response types), controller registration, e2e test in `test/<module>/`. **Out of scope:** business logic, repository access, error translation (global `DomainExceptionFilter` does it).

## Rules
- Controller → use case only. No repositories, no `IUnitOfWork`, no `if` business rules.
- Request DTO: class with `class-validator` / `class-transformer` decorators (imported directly). Validates shape/format only; business rules stay in domain.
- Global `ValidationPipe` is `whitelist + forbidNonWhitelisted + transform` — every accepted field needs a decorator.
- Map DTO → `T<Action>Input` explicitly (don't pass the DTO object through).
- Response: plain type `T<X>Response` in `infrastructure/http/`, mapped from use case output.
- Never catch `DomainException` in the controller. Status codes: `@HttpCode` only for non-default success codes.
- Routes: plural kebab-case nouns (`/users`, `/crop-seasons/:id`). IDs validated with `ParseUUIDPipe`.

## Templates
```ts
// infrastructure/http/dto/register-user.dto.ts
import { IsEmail, IsString, Length } from 'class-validator';

export class RegisterUserDto {
  @IsEmail() email: string;
  @IsString() @Length(1, 100) name: string;
}
```
```ts
// infrastructure/http/user.controller.ts
import { Body, Controller, Post } from '@nestjs/common';

export type TRegisterUserResponse = { id: string };

@Controller('users')
export class UserController {
  constructor(private readonly registerUser: RegisterUserUseCase) {}

  @Post()
  async register(@Body() dto: RegisterUserDto): Promise<TRegisterUserResponse> {
    const { userId } = await this.registerUser.execute({ email: dto.email, name: dto.name });
    return { id: userId };
  }
}
```
Register in `controllers` of `<module>.module.ts`.

## e2e test
`test/<module>/<action>.e2e-spec.ts`: boot `AppModule`, `supertest` against the route. Cover: success, validation error (400), each domain exception status. Clean the module's tables in `beforeEach` via `DataSource` query. Requires `docker compose up -d` and applied migrations.

## Steps
1. DTOs. 2. Controller + registration. 3. e2e test. 4. `npm run lint && npm run build && npm run test:e2e`.

## Report
Endpoints (method, path, body, success code, error codes). Self-test curl example, e.g.:
`curl -X POST localhost:3000/users -H 'content-type: application/json' -d '{"email":"a@b.co","name":"A"}'`. Stop.
