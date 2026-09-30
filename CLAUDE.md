# AgriPedia Server

NestJS 10 (TypeScript) backend. Postgres 16 via `docker-compose.yml` (pgAdmin on :5050).

## Commands

- `docker compose up -d` — start Postgres + pgAdmin
- `npm run start:dev` — dev server (watch)
- `npm run build` — compile to `dist/`
- `npm run openapi:export [-- <path>]` — build + write OpenAPI document (default `openapi.json`), no DB needed
- `npm run lint` / `npm run format` — ESLint (auto-fix) / Prettier
- `npm test` — unit tests (`*.spec.ts` under `src/`)
- `npm run test:e2e` — e2e tests (`test/`)
- `npm run migration:generate -- src/migrations/<module>-<desc>` / `migration:run` / `migration:revert`

Run `npm run lint` and `npm test` before calling a task done.

## Architecture: modular monolith + hexagonal

One deployable app, split into business modules. Each module is a hexagon: domain in the center, ports around it, adapters outside.

```
src/
├── main.ts
├── app.module.ts            # wires shared modules + business modules
├── config/                  # config groups (zod-validated), see "Config"
├── migrations/              # TypeORM migrations, named <timestamp>-<module>-<desc>
├── shared/
│   ├── config/              # wraps @nestjs/config -> IConfigService (CONFIG_SERVICE)
│   ├── database/            # wraps TypeORM -> IUnitOfWork (UNIT_OF_WORK), TypeOrmRepositoryBase
│   ├── logger/              # wraps nestjs-pino -> ILogger (LOGGER), useAppLogger()
│   ├── event-bus/           # wraps @nestjs/event-emitter -> IEventBus (EVENT_BUS), @OnIntegrationEvent
│   ├── crypto/              # wraps node:crypto -> ICryptoService (CRYPTO_SERVICE): HMAC hash, AES-GCM, scrypt password
│   ├── access-token/        # wraps @nestjs/jwt -> IAccessTokenService (ACCESS_TOKEN_SERVICE): sign/verify access tokens; AccessTokenGuard + @CurrentUser() for protected routes; OptionalAccessTokenGuard + @OptionalCurrentUser() for public routes that use the caller when a token is sent
│   ├── messaging/           # IMessageSender (MESSAGE_SENDER): email/SMS; currently log-only adapter
│   ├── storage/             # wraps firebase-admin -> IFileStorage (FILE_STORAGE): presigned upload URLs, signed download URLs, move/delete objects (Firebase Storage / GCS)
│   ├── realtime/            # wraps @nestjs/websockets + socket.io -> IRealtimePublisher (REALTIME_PUBLISHER): emitToUser; IRealtimeChannels (REALTIME_CHANNELS): join/leave/hasUser presence channels; IRealtimeTicketService (REALTIME_TICKET_SERVICE): short-lived socket-only tickets for browsers behind a BFF; handshake auth by `auth.ticket` or access token; @RealtimeGateway() + @SocketUser() + @SocketConnectionId() for inbound gateways (errors/validation answered via ack)
│   ├── swagger/             # wraps @nestjs/swagger -> setupSwagger(), defineApiDocs() (docs adapter, keeps controllers clean)
│   ├── domain/              # pure-TS kernel: AggregateRoot, DomainException, EDomainErrorType, TDomainEvent
│   └── http/                # global ValidationPipe + DomainExceptionFilter
└── modules/
    └── <module>/
        ├── contracts/       # PUBLIC API of the module (only thing others may import)
        │   ├── events/      # integration event names + payload types
        │   ├── ports/       # query ports other modules may call (I<X>QueryPort)
        │   ├── tokens.ts    # DI tokens (Symbols) for exported ports
        │   └── index.ts
        ├── domain/          # entities, value objects, domain events, domain exceptions
        ├── application/
        │   ├── ports/       # outbound ports (I<X>Repository, ...) + tokens
        │   └── use-cases/   # one use case per file
        ├── infrastructure/
        │   ├── persistence/ # *.orm-entity.ts, mappers, Pg<X>Repository
        │   ├── http/        # controllers, DTOs, responses/*.response.ts, <name>.api-docs.ts
        │   ├── handlers/    # integration event handlers
        │   └── queries/     # implementations of contracts/ports
        └── <module>.module.ts
```

Path aliases: `@config`, `@shared/*`, `@modules/*` (tsconfig + jest mapped).

### Dependency rules (hard)

- `domain/` imports only other `domain/` files and `@shared/domain`. No NestJS, no TypeORM, no external package.
- `application/` depends on `domain/`, its own ports, and shared interfaces (`IUnitOfWork`, `IEventBus`) — never on concrete adapters.
- `infrastructure/` implements ports; may use `@shared/*` and utility packages.
- Adapters are bound to ports via DI tokens in `<module>.module.ts` (`{ provide: USER_REPOSITORY, useClass: PgUserRepository }`). Inject by token, type by interface.

### Cross-module communication (hard)

Modules never talk to each other directly.

- A module may import **only** from another module's `contracts/` (types, interfaces, tokens, event names). Never from its `domain/`, `application/`, or `infrastructure/`, and never inject another module's concrete class.
- **Async / side effects** → publish an integration event through `IEventBus`. Name + payload type live in the publisher's `contracts/events/`. Subscribers use `@OnIntegrationEvent` in their own `infrastructure/handlers/` and call their own use case.
- **Sync query** (read-only) → depend on `I<X>QueryPort` from the provider's `contracts/ports/`, injected by its token. Provider binds and exports the implementation.
- Each module owns its tables. No cross-module joins or foreign keys.
- No circular module dependencies. If two modules need each other, use events.

### Transactions & events

- Use case wraps writes in `unitOfWork.runInTransaction(...)`. Repositories extending `TypeOrmRepositoryBase` join it automatically.
- Publish integration events **after** the transaction resolves, never inside it.

## Errors

- Business errors = subclasses of `DomainException` (`@shared/domain`) in the module's `domain/exceptions/`, each with a stable `code` (`<MODULE>_<REASON>`) and an `EDomainErrorType`.
- Throw them from domain/application. `DomainExceptionFilter` maps type → HTTP status. Controllers never catch-and-translate.

## Config

- One file per group under `src/config/` (`app.config.ts`, `database.config.ts`): zod schema, inferred type `T<Group>Config`, `registerAs('<group>', ...)` factory that parses `process.env`.
- `src/config/index.ts` lists all groups in `configGroups` and the `TConfigMap` type; `SharedConfigModule` loads them in one place.
- Read config only via `IConfigService` (`CONFIG_SERVICE`): `config.get('database')` → `TDatabaseConfig`. No `process.env` outside `src/config/`.
- New env var → group schema + `.env.example`.

## Logging

- Logger: **Pino** (via `nestjs-pino`), wrapped in `src/shared/logger/` behind `ILogger` (`LOGGER` token). Config group `logger` (`LOG_LEVEL`, `LOG_FILE_PATH`).
- Development/test: pino → `pino-pretty` transport → terminal. Production (`NODE_ENV=production`): pino → JSON → `pino/file` transport → `LOG_FILE_PATH`.
- Usage: `constructor(@Inject(LOGGER) logger: ILogger) { this.logger = logger.withContext(MyUseCase.name); }`. Errors: `logger.error(message, error, meta)`. Tests: `InMemoryLogger`.
- HTTP requests are auto-logged with a request id; logs written during a request carry it. Nest's own logs go through pino (`useAppLogger` in `main.ts`).
- Business code never uses `console.*` or Nest's `Logger`. `ILogger` lives in `@shared/logger`, so `domain/` does not log — log in application/infrastructure.

## API docs (Swagger)

- UI `/docs`, JSON `/docs-json`; off when `NODE_ENV=production`. Schemas come from the `@nestjs/swagger` CLI plugin (`nest-cli.json`) → only after `npm run build`, not under ts-jest/ts-node.
- Controllers and DTOs carry **no** `@Api*` decorators. Tag/summary/error codes live in `<name>.api-docs.ts` via `defineApiDocs`, side-effect imported by the module file. Response bodies are classes in `*.response.ts` so the plugin sees them.
- Handlers behind `AccessTokenGuard` set `auth: true` in their `defineApiDocs` entry (bearer scheme + 401 `AUTH_INVALID_ACCESS_TOKEN`).

## External packages

- **DI / runtime-configured packages** (module registration, providers, lifecycle: `@nestjs/config`, `@nestjs/typeorm`, `@nestjs/event-emitter`, queues, cache, mailers, HTTP clients, ...) → wrap in `src/shared/<concern>/`: project interface + token + Nest module. Business modules use the interface, never the package's module/service.
- **Utilities** (decorators and helpers with no DI: `class-validator`, `class-transformer`, TypeORM entity decorators and `Repository` type, `zod`, date/string libs) → import directly, but only outside `domain/`.
- Framework core (`@nestjs/common`, `@nestjs/core`, `rxjs`) → direct, outside `domain/`.
- New DI-type dependency → create its `shared/` wrapper in the same change (skill `hex-shared-wrapper`).

## Naming

- Types: `T` prefix — `TUser`, `TCreateUserInput`, `TDatabaseConfig`.
- Interfaces: `I` prefix — `IUserRepository`, `IEventBus`, `IUserQueryPort`.
- Enums: `E` prefix — `EUserRole`, `EOrderStatus`.
- Classes: PascalCase, no prefix — `User`, `CreateUserUseCase`, `PgUserRepository`, `EmailAlreadyUsedException`.
- DI tokens: UPPER_SNAKE `Symbol` — `USER_REPOSITORY = Symbol('USER_REPOSITORY')`.
- Integration events: `<module>.<entity>.<past-tense>` — `'user.account.registered'`, payload `TUserRegisteredEventPayload`.
- Files: kebab-case with role suffix — `user.entity.ts`, `email.vo.ts`, `user-registered.domain-event.ts`, `email-already-used.exception.ts`, `user.repository.ts` (port), `user.orm-entity.ts`, `user.mapper.ts`, `pg-user.repository.ts`, `register-user.use-case.ts`, `user.controller.ts`, `register-user.dto.ts`, `user-registered.event.ts`, `user-registered.handler.ts`.
- Folders imported from outside expose an `index.ts` barrel.

## Testing

- Unit-test domain and use cases with in-memory fakes (`InMemory<X>Repository`, `InMemoryUnitOfWork`, `InMemoryEventBus`). No DB, no Nest container.
- HTTP adapters: e2e test in `test/` (needs `docker compose up -d`).

## Skills (hexagonal workflow)

Project skills in `.claude/skills/`. For a whole feature use `/hex-feature`: it reports a plan first, then runs one skill per step and stops for review after each. Single-scope skills: `hex-module-scaffold`, `hex-config-group`, `hex-shared-wrapper`, `hex-domain-model`, `hex-domain-event`, `hex-use-case`, `hex-persistence-adapter`, `hex-integration-event`, `hex-event-handler`, `hex-query-port`, `hex-http-adapter`, `hex-api-docs`, `hex-boundary-review`. Stay within the invoked skill's scope.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
