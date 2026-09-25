# Graph Report - server  (2026-09-25)

## Corpus Check
- 60 files · ~8,155 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 380 nodes · 467 edges · 28 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `faa3393f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- TypeScript Compiler Config
- Runtime NestJS Dependencies
- App Module Controller Service
- Jest Test Config
- npm Scripts
- Postgres Dev Stack & Docs
- Build Tsconfig Excludes
- Lint & Build Tooling
- Nest CLI Config
- Graphify Workflow Rules
- Prettier ESLint Config
- Prettier ESLint Plugin
- Jest Dependency
- Nest CLI Dependency
- Nest Testing Dependency
- Prettier Dependency
- Source Map Support
- Supertest Dependency
- ts-jest Dependency
- ts-node Dependency
- tsconfig-paths Dependency
- Express Types
- Jest Types
- Node Types
- Supertest Types
- TypeScript Dependency
- TS ESLint Plugin

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 19 edges
2. `scripts` - 18 edges
3. `TIntegrationEvent` - 14 edges
4. `jest` - 9 edges
5. `IEventBus` - 8 edges
6. `hex-persistence-adapter` - 8 edges
7. `hex-use-case` - 8 edges
8. `AppService` - 7 edges
9. `EventEmitterEventBus` - 7 edges
10. `hex-domain-model` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Nest TypeScript Starter Repository` --shares_data_with--> `postgres Service (postgres:16, agri-media DB)`  [INFERRED]
  README.md → docker-compose.yml
- `bootstrap()` --indirect_call--> `AppModule`  [INFERRED]
  src/main.ts → src/app.module.ts
- `NestConfigService` --implements--> `IConfigService`  [EXTRACTED]
  src/shared/config/nest-config.service.ts → src/shared/config/config-service.interface.ts
- `InMemoryUnitOfWork` --implements--> `IUnitOfWork`  [EXTRACTED]
  src/shared/database/in-memory.unit-of-work.ts → src/shared/database/unit-of-work.interface.ts
- `TypeOrmUnitOfWork` --implements--> `IUnitOfWork`  [EXTRACTED]
  src/shared/database/typeorm.unit-of-work.ts → src/shared/database/unit-of-work.interface.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Local Dev Database Stack (Postgres + pgAdmin + volumes)** — docker_compose_postgres, docker_compose_pgadmin, docker_compose_postgres_data, docker_compose_pgadmin_data [EXTRACTED 1.00]

## Communities (28 total, 0 thin omitted)

### Community 0 - "TypeScript Compiler Config"
Cohesion: 0.08
Nodes (25): src/config, src/modules/*, src/shared/*, compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata (+17 more)

### Community 1 - "Runtime NestJS Dependencies"
Cohesion: 0.07
Nodes (29): class-transformer, class-validator, dotenv, @nestjs/common, @nestjs/config, @nestjs/core, @nestjs/event-emitter, @nestjs/platform-express (+21 more)

### Community 2 - "App Module Controller Service"
Cohesion: 0.13
Nodes (14): Controller, Get, AppController, AppModule, Module, AppService, Injectable, bootstrap() (+6 more)

### Community 3 - "Jest Test Config"
Cohesion: 0.08
Nodes (23): author, description, jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, moduleNameMapper, rootDir (+15 more)

### Community 4 - "npm Scripts"
Cohesion: 0.11
Nodes (18): scripts, build, format, lint, migration:create, migration:generate, migration:revert, migration:run (+10 more)

### Community 5 - "Postgres Dev Stack & Docs"
Cohesion: 0.22
Nodes (9): pgadmin Service (pgAdmin4), pgadmin_data Volume, postgres Service (postgres:16, agri-media DB), postgres_data Volume, NestJS Mau (AWS Deployment Platform), NestJS Devtools, NestJS Framework, Nest TypeScript Starter Repository (+1 more)

### Community 6 - "Build Tsconfig Excludes"
Cohesion: 0.25
Nodes (7): dist, node_modules, **/*spec.ts, test, ./tsconfig.json, exclude, extends

### Community 7 - "Lint & Build Tooling"
Cohesion: 0.05
Nodes (43): eslint, eslint-config-prettier, eslint-plugin-prettier, jest, @nestjs/cli, @nestjs/schematics, @nestjs/testing, devDependencies (+35 more)

### Community 8 - "Nest CLI Config"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 9 - "Graphify Workflow Rules"
Cohesion: 0.67
Nodes (4): GRAPH_REPORT.md, Graphify Knowledge Graph (graphify-out/), Query Graph Before Raw Source Rule, Run graphify update After Code Changes

### Community 10 - "Prettier ESLint Config"
Cohesion: 0.15
Nodes (13): EVENT_BUS, IEventBus, EventBusModule, Global, Module, TestHandler, Injectable, EventEmitterEventBus (+5 more)

### Community 11 - "Prettier ESLint Plugin"
Cohesion: 0.14
Nodes (14): appConfig, appConfigSchema, TAppConfig, databaseConfig, databaseConfigSchema, TDatabaseConfig, configGroups, TConfigMap (+6 more)

### Community 12 - "Jest Dependency"
Cohesion: 0.15
Nodes (9): Catch, AggregateRoot, EDomainErrorType, TDomainEvent, DomainException, DomainExceptionFilter, STATUS_BY_TYPE, SharedHttpModule (+1 more)

### Community 13 - "Nest CLI Dependency"
Cohesion: 0.16
Nodes (7): InMemoryUnitOfWork, transactionContext, TypeOrmRepositoryBase, Injectable, TypeOrmUnitOfWork, IUnitOfWork, UNIT_OF_WORK

### Community 14 - "Nest Testing Dependency"
Cohesion: 0.22
Nodes (8): hex-persistence-adapter, Migration, Report, Rules, Steps, Templates, Tests, Wiring

### Community 15 - "Prettier Dependency"
Cohesion: 0.22
Nodes (8): hex-use-case, Module wiring, Port template, Report, Rules, Steps, Tests, Use case template

### Community 16 - "Source Map Support"
Cohesion: 0.25
Nodes (7): Hard rules, hex-domain-model, Layout, Report, Steps, Templates, Tests

### Community 17 - "Supertest Dependency"
Cohesion: 0.25
Nodes (7): Consumer wiring, hex-query-port, Provider templates, Report, Rules, Steps, Tests

### Community 18 - "ts-jest Dependency"
Cohesion: 0.29
Nodes (6): hex-domain-event, Report, Rules, Steps, Template, Tests

### Community 19 - "ts-node Dependency"
Cohesion: 0.29
Nodes (6): hex-event-handler, Report, Rules, Steps, Template, Tests

### Community 20 - "tsconfig-paths Dependency"
Cohesion: 0.29
Nodes (6): Done, hex-feature, Phase 0 — Resume check, Phase 1 — Report (no code), Phase 2 — Implement, one step per turn, Plan changes

### Community 21 - "Express Types"
Cohesion: 0.29
Nodes (6): e2e test, hex-http-adapter, Report, Rules, Steps, Templates

### Community 22 - "Jest Types"
Cohesion: 0.29
Nodes (6): hex-integration-event, Report, Rules, Steps, Template, Tests

### Community 23 - "Node Types"
Cohesion: 0.29
Nodes (6): hex-shared-wrapper, Report, Rules, Steps, Structure, Wrap or not?

### Community 24 - "Supertest Types"
Cohesion: 0.33
Nodes (5): hex-config-group, Report, Rules, Steps, Template

### Community 25 - "TypeScript Dependency"
Cohesion: 0.40
Nodes (4): hex-module-scaffold, Input, Report, Steps

### Community 26 - "TS ESLint Plugin"
Cohesion: 0.50
Nodes (3): Checks (grep-driven, then read to confirm), hex-boundary-review, Output

## Knowledge Gaps
- **174 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `name` (+169 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Lint & Build Tooling` to `Jest Test Config`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime NestJS Dependencies` to `Jest Test Config`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `scripts` connect `npm Scripts` to `Jest Test Config`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _174 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TypeScript Compiler Config` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `Runtime NestJS Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `App Module Controller Service` be split into smaller, more focused modules?**
  _Cohesion score 0.1341991341991342 - nodes in this community are weakly interconnected._