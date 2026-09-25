---
name: hex-boundary-review
description: Read-only audit of hexagonal rules in src/ (or given paths/modules) — cross-module imports, framework in domain, process.env outside config, DI packages used outside shared, naming prefixes, controller/handler logic leaks. Outputs file:line findings, never edits. Use at the end of a feature or on demand.
---

# hex-boundary-review

**Scope:** read and report only. Never edit files. Default target: files changed on the current branch (`git diff --name-only main...HEAD` + uncommitted); if empty, all of `src/`.

## Checks (grep-driven, then read to confirm)

| # | Rule | How to find |
|---|---|---|
| 1 | Other module imported outside `contracts` | `grep -rnE "@modules/[a-z-]+/(domain|application|infrastructure)" src/modules`, plus relative `../../<other-module>/` imports |
| 2 | `domain/` impure | in `src/modules/*/domain`: imports of `@nestjs`, `typeorm`, `class-validator`, `@shared/` other than `@shared/domain`, `application/`, `infrastructure/`; any decorator `@` |
| 3 | `application/` depends on adapters | in `src/modules/*/application`: imports of `infrastructure/`, `typeorm`, `express`, `class-validator` |
| 4 | `process.env` outside `src/config` | `grep -rn "process.env" src --include=*.ts \| grep -v "^src/config/"` |
| 5 | DI packages outside `shared/` | imports of `@nestjs/config`, `@nestjs/typeorm`, `@nestjs/event-emitter` outside `src/shared/` |
| 6 | Naming | `type X =` without `T`, `interface X` without `I`, `enum X` without `E`; files not kebab-case with role suffix |
| 7 | Cross-module DB | `@ManyToOne`/`@OneToMany`/`@JoinColumn` referencing another module's `*OrmEntity`; migrations adding FK to another module's table |
| 8 | Contracts leak domain | `contracts/` importing own `domain/` or exporting entities |
| 9 | Thin adapters | controllers/handlers injecting repositories or `UNIT_OF_WORK`, or containing business branching |
| 10 | Events in transaction | `eventBus.publish` inside a `runInTransaction(` callback |
| 11 | Unbound tokens | port tokens injected but not provided in any module |

## Output
One line per finding, most severe first:
`path:line: <HIGH|MED|LOW>: <rule #> <problem>. <fix>.`
End with counts per severity. No praise, no restating clean checks. If nothing found: `No boundary violations.`
