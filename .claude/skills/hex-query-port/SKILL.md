---
name: hex-query-port
description: Synchronous read-only access between modules — define I<X>QueryPort + token + result types in the provider module's contracts/ports/, implement and export it, and wire the consumer to inject it by token. Use when a module needs data owned by another module right now (no writes).
---

# hex-query-port

**Scope:** provider `contracts/ports/` + `contracts/tokens.ts` + `infrastructure/queries/` + both modules' `<module>.module.ts` + tests. **Out of scope:** writes across modules (use events), consumer use case logic.

## Rules
- Read-only. Any method that changes state is forbidden here → use `hex-integration-event`.
- Result types are contract DTOs (`T<X>Summary`), primitives only — never domain entities.
- Method names describe the question: `findSummaryById`, `existsById`, `listByIds`. Batch methods preferred over N calls.
- Implementation may reuse the module's repository port or query TypeORM directly (read side), inside `infrastructure/queries/`.
- Consumer depends only on `@modules/<provider>/contracts`. If this creates a circular module dependency, stop and propose an event instead.

## Provider templates
```ts
// contracts/ports/user-query.port.ts
export type TUserSummary = { id: string; name: string; email: string };

export interface IUserQueryPort {
  findSummaryById(id: string): Promise<TUserSummary | null>;
  listSummariesByIds(ids: string[]): Promise<TUserSummary[]>;
}
```
```ts
// contracts/tokens.ts
export const USER_QUERY_PORT = Symbol('USER_QUERY_PORT');
```
```ts
// infrastructure/queries/user-query.service.ts
@Injectable()
export class UserQueryService implements IUserQueryPort {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}
  // map domain -> TUserSummary
}
```
Provider module: `providers: [{ provide: USER_QUERY_PORT, useClass: UserQueryService }]`, `exports: [USER_QUERY_PORT]`.

## Consumer wiring
- `<consumer>.module.ts`: `imports: [UserModule]` (the only allowed kind of cross-module Nest import: to obtain exported contract tokens).
- In consumer use case: `@Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort`.
- Consumer unit tests use a stub object implementing `IUserQueryPort`.

## Tests
Provider: `user-query.service.spec.ts` with in-memory repository fake.

## Steps
1. Contract types + port + token + barrels. 2. Implementation + binding + export. 3. Consumer module import. 4. `npm run lint && npm test && npm run build`.

## Report
Port methods + result types, provider/consumer wiring. Stop.
