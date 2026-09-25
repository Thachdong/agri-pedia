---
name: hex-module-scaffold
description: Create an empty hexagonal business module (folders, <module>.module.ts, barrels) and register it in app.module.ts. Use when a feature needs a module that does not exist yet. No entities, use cases or logic.
---

# hex-module-scaffold

**Scope:** module skeleton only. **Out of scope:** any entity, port, use case, adapter, controller.

## Input
Module name (singular, kebab-case, e.g. `user`, `crop-season`).

## Steps
1. Stop if `src/modules/<module>/` already exists — report and do nothing.
2. Create:
```
src/modules/<module>/
├── contracts/
│   ├── events/index.ts      # export {};
│   ├── ports/index.ts       # export {};
│   ├── tokens.ts            # export {};
│   └── index.ts             # export * from './events'; export * from './ports'; export * from './tokens';
├── domain/index.ts          # export {};
├── application/
│   ├── ports/index.ts       # export {};
│   └── use-cases/index.ts   # export {};
├── infrastructure/          # .gitkeep (subfolders created by adapter skills)
└── <module>.module.ts
```
3. `<module>.module.ts`:
```ts
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class <Module>Module {}
```
4. Add `<Module>Module` to `imports` in `src/app.module.ts` under `// business modules`, import via `@modules/<module>/<module>.module`.
5. Run `npm run build`.

## Report
Files created + `app.module.ts` diff. Stop.
