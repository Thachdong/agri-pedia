---
name: hex-shared-wrapper
description: Wrap a DI/runtime-configured external package (Nest dynamic module, client, queue, cache, mailer, storage SDK...) in src/shared/<concern>/ behind a project interface + DI token + global Nest module. Use before any business module needs such a package, or when hex-feature finds the wrapper missing.
---

# hex-shared-wrapper

**Scope:** `src/shared/<concern>/`, `package.json`, wiring in `app.module.ts`, config group if needed. **Out of scope:** using the wrapper inside business modules.

## Wrap or not?
- Wrap: package that registers a Nest module, provides injectable services, holds connections/clients, needs runtime config.
- Do NOT wrap (import directly outside `domain/`): pure utilities/decorators (`class-validator`, `class-transformer`, `zod`, TypeORM entity decorators, date libs). If the package is a utility, say so and stop.

## Structure
```
src/shared/<concern>/
├── <concern>.interface.ts     # I<Concern> + <CONCERN> token (Symbol)
├── <lib>.<concern>.ts         # adapter implementing I<Concern> using the package
├── in-memory.<concern>.ts     # test fake implementing I<Concern>
├── <concern>.module.ts        # @Global module: registers package module, binds token, exports token
└── index.ts                   # exports interface, token, module, fake (NOT the adapter)
```
References: `src/shared/event-bus/`, `src/shared/database/`, `src/shared/config/`.

## Rules
- Interface is shaped by what the project needs, not a copy of the library API. No library types in the interface signature.
- Package config comes from `IConfigService` via `forRootAsync({ inject: [CONFIG_SERVICE], useFactory })`. If new env keys are needed, apply skill `hex-config-group` first.
- Only files inside `src/shared/<concern>/` import the package's module/service.
- Name `<Concern>Module` or `Shared<Concern>Module` if it clashes with the library's module name.

## Steps
1. `npm install <package>` (pin major compatible with NestJS 10).
2. Config group if needed (`hex-config-group`).
3. Create files above.
4. Add module to `src/app.module.ts` under `// shared infrastructure`.
5. Add the concern to the `shared/` tree in `CLAUDE.md`.
6. `npm run build && npm run lint`.

## Report
Package + version, interface methods, token, files. Stop.
