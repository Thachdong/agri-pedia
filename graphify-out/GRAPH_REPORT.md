# Graph Report - .  (2026-09-24)

## Corpus Check
- Corpus is ~1,171 words - fits in a single context window. You may not need a graph.

## Summary
- 151 nodes · 156 edges · 29 communities (11 shown, 18 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.83)
- Token cost: 41,701 input · 0 output

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
- TS ESLint Parser

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `scripts` - 13 edges
3. `jest` - 8 edges
4. `AppService` - 7 edges
5. `AppController` - 6 edges
6. `AppModule` - 5 edges
7. `exclude` - 5 edges
8. `moduleFileExtensions` - 4 edges
9. `Graphify Knowledge Graph (graphify-out/)` - 3 edges
10. `NestJS Framework` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Nest TypeScript Starter Repository` --shares_data_with--> `postgres Service (postgres:16, agri-media DB)`  [INFERRED]
  README.md → docker-compose.yml
- `bootstrap()` --indirect_call--> `AppModule`  [INFERRED]
  src/main.ts → src/app.module.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Local Dev Database Stack (Postgres + pgAdmin + volumes)** — docker_compose_postgres, docker_compose_pgadmin, docker_compose_postgres_data, docker_compose_pgadmin_data [EXTRACTED 1.00]

## Communities (29 total, 18 thin omitted)

### Community 0 - "TypeScript Compiler Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, experimentalDecorators, forceConsistentCasingInFileNames, incremental (+10 more)

### Community 1 - "Runtime NestJS Dependencies"
Cohesion: 0.11
Nodes (17): @nestjs/common, @nestjs/core, @nestjs/platform-express, author, dependencies, @nestjs/common, @nestjs/core, @nestjs/platform-express (+9 more)

### Community 2 - "App Module Controller Service"
Cohesion: 0.21
Nodes (8): Controller, Get, Injectable, Module, AppController, AppModule, AppService, bootstrap()

### Community 3 - "Jest Test Config"
Cohesion: 0.15
Nodes (13): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+5 more)

### Community 4 - "npm Scripts"
Cohesion: 0.15
Nodes (13): scripts, build, format, lint, start, start:debug, start:dev, start:prod (+5 more)

### Community 5 - "Postgres Dev Stack & Docs"
Cohesion: 0.22
Nodes (9): pgadmin Service (pgAdmin4), pgadmin_data Volume, postgres Service (postgres:16, agri-media DB), postgres_data Volume, NestJS Mau (AWS Deployment Platform), NestJS Devtools, NestJS Framework, Nest TypeScript Starter Repository (+1 more)

### Community 6 - "Build Tsconfig Excludes"
Cohesion: 0.25
Nodes (7): dist, node_modules, **/*spec.ts, test, ./tsconfig.json, exclude, extends

### Community 7 - "Lint & Build Tooling"
Cohesion: 0.29
Nodes (7): eslint, @nestjs/schematics, devDependencies, eslint, @nestjs/schematics, ts-loader, ts-loader

### Community 8 - "Nest CLI Config"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 9 - "Graphify Workflow Rules"
Cohesion: 0.67
Nodes (4): GRAPH_REPORT.md, Graphify Knowledge Graph (graphify-out/), Query Graph Before Raw Source Rule, Run graphify update After Code Changes

## Knowledge Gaps
- **85 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `name` (+80 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Lint & Build Tooling` to `Runtime NestJS Dependencies`, `Prettier ESLint Config`, `Prettier ESLint Plugin`, `Jest Dependency`, `Nest CLI Dependency`, `Nest Testing Dependency`, `Prettier Dependency`, `Source Map Support`, `Supertest Dependency`, `ts-jest Dependency`, `ts-node Dependency`, `tsconfig-paths Dependency`, `Express Types`, `Jest Types`, `Node Types`, `Supertest Types`, `TypeScript Dependency`, `TS ESLint Plugin`, `TS ESLint Parser`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **Why does `scripts` connect `npm Scripts` to `Runtime NestJS Dependencies`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `jest` connect `Jest Test Config` to `Runtime NestJS Dependencies`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _85 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TypeScript Compiler Config` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Runtime NestJS Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._