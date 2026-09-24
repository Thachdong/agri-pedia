# AgriPedia Server

NestJS 10 (TypeScript) backend. Postgres 16 via `docker-compose.yml` (pgAdmin on :5050).

## Commands

- `docker compose up -d` — start Postgres + pgAdmin
- `npm run start:dev` — dev server (watch)
- `npm run build` — compile to `dist/`
- `npm run lint` / `npm run format` — ESLint (auto-fix) / Prettier
- `npm test` — unit tests (`*.spec.ts` under `src/`)
- `npm run test:e2e` — e2e tests (`test/`)

Run `npm run lint` and `npm test` before calling a task done.

## Architecture: modular monolith + hexagonal

One deployable app, split into business modules. Each module is a hexagon: domain in the center, ports around it, adapters outside.

```
src/
├── main.ts
├── app.module.ts            # wires ConfigModule, shared modules, business modules
├── config/                  # config groups (see "Config")
├── shared/                  # wrappers for ALL external packages + cross-cutting infra
│   ├── config/              # wraps @nestjs/config -> typed IConfigService
│   ├── event-bus/           # IEventBus port + adapter, TDomainEvent base type
│   ├── database/            # ORM wrapper, base repository, transaction helper
│   ├── logger/              # ILogger + adapter
│   └── ...                  # one folder per wrapped package/concern
└── modules/
    └── <module>/
        ├── contracts/       # PUBLIC API of the module (only thing others may import)
        │   ├── events/      # integration event names + payload types
        │   ├── ports/       # interfaces other modules may call (e.g. IUserQueryPort)
        │   ├── tokens.ts    # DI tokens (Symbols) for exported ports
        │   └── index.ts
        ├── domain/          # entities, value objects, domain events, repository ports
        ├── application/     # use cases, application services, inbound/outbound ports
        ├── infrastructure/  # adapters: persistence, http controllers, event handlers
        └── <module>.module.ts
```

### Dependency rules (hard)

- `domain/` imports nothing from `application/`, `infrastructure/`, NestJS, or any external package. Pure TypeScript.
- `application/` depends on `domain/` and on port interfaces only — never on concrete adapters.
- `infrastructure/` implements ports and may use `@shared/*`.
- Adapters are bound to ports via DI tokens in `<module>.module.ts` (`{ provide: USER_REPOSITORY, useClass: PgUserRepository }`). Inject by token, type by interface.

### Cross-module communication (hard)

Modules never talk to each other directly.

- A module may import **only** from another module's `contracts/` (types, interfaces, tokens, event names). Never from its `domain/`, `application/`, or `infrastructure/`, and never inject another module's concrete service/class.
- **Async / side effects** → publish an integration event through `IEventBus` (`@shared/event-bus`). The event name + payload type live in the publisher's `contracts/events/`. Subscribers handle it in their own `infrastructure/` event handler and call their own use case.
- **Sync query** (rare, read-only) → depend on a port interface from the provider's `contracts/ports/`, injected by its token. The provider module binds and exports the implementation.
- No shared DB tables between modules; no cross-module joins or FK-based reach-ins. Each module owns its tables.
- No circular module dependencies. If two modules need each other, use events.

## Config

- Config is split into **groups** under `src/config/`, one file per group: `app.config.ts`, `database.config.ts`, `auth.config.ts`, ...
- Each group file exports: its type (`TDatabaseConfig`), a factory reading `process.env` (namespaced, e.g. `registerAs('database', ...)`), and env validation for its keys.
- `src/config/index.ts` exports the list of all groups; `app.module.ts` loads them explicitly in one place. No implicit/scattered `process.env` reads.
- Code reads config only via the typed `IConfigService` from `@shared/config` (e.g. `config.get('database')` returns `TDatabaseConfig`). Never read `process.env` outside `src/config/`.
- Adding an env var: add it to its group + validation + `.env.example`.

## External packages

- Every external package must be wrapped/configured in `src/shared/<concern>/` before use. Business modules import the wrapper (`@shared/...`), never the package.
- Wrapper exposes a project-owned interface (`ILogger`, `IEventBus`, `IHashService`, ...) plus a Nest module that provides the adapter. Swapping the library must only touch `shared/`.
- Allowed directly anywhere (framework core): `@nestjs/common`, `@nestjs/core`, `reflect-metadata`, `rxjs` — except in `domain/`, which stays framework-free.
- Before adding a new dependency, create its `shared/` wrapper in the same change.

## Naming

- Types: `T` prefix — `type TUser = {...}`, `TCreateUserInput`, `TDatabaseConfig`.
- Interfaces: `I` prefix — `IUserRepository`, `IEventBus`, `IUserQueryPort`.
- Enums: `E` prefix — `EUserRole`, `EOrderStatus`.
- Classes: PascalCase, no prefix — `User`, `CreateUserUseCase`, `PgUserRepository`.
- DI tokens: UPPER_SNAKE `Symbol` — `export const USER_REPOSITORY = Symbol('USER_REPOSITORY')`.
- Integration events: `<module>.<entity>.<past-tense>` — `'user.account.created'`, payload type `TUserCreatedEvent`.
- Files: kebab-case with role suffix — `user.entity.ts`, `user.repository.ts` (port), `pg-user.repository.ts` (adapter), `create-user.use-case.ts`, `user.controller.ts`, `user-created.event.ts`, `user-created.handler.ts`, `database.config.ts`.
- Each folder that is imported from outside exposes an `index.ts` barrel.

## Testing

- Unit-test use cases with in-memory fakes of ports (no DB, no Nest container).
- Adapter/controller tests go in `infrastructure/` alongside the adapter.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
