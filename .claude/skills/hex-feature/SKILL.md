---
name: hex-feature
description: Orchestrate implementation of a whole feature in this hexagonal NestJS project. Phase 1 reports a short plan mapped to hex-* skills and waits for approval; Phase 2 runs exactly one skill per turn in the fixed order and stops after each for developer review and self-test. Use when the user asks to implement/build a feature, or invokes /hex-feature.
---

# hex-feature

Two phases. Never run the whole feature in one go.

## Phase 0 — Resume check
If `.claude/plans/<feature-slug>.md` exists and has unchecked steps, show its status and continue Phase 2 from the first unchecked step (after the developer confirms). Otherwise start Phase 1.

## Phase 1 — Report (no code)
1. Understand the feature. Inspect relevant modules (`graphify query "<question>"` first, then targeted reads). Ask only questions whose answer changes the plan.
2. Check shared foundation: needed wrappers exist in `src/shared/` (config, database, event-bus, domain, http, plus anything the feature needs e.g. mail, cache, storage) and config groups exist. Missing → plan a `[shared-wrapper]` / `[config-group]` step first.
3. Write a short plan — one line per step, tagged with the skill, WHAT not HOW. No code, no file-by-file detail. Format:

```
Feature: <name>
1. [module-scaffold]    module `user`
2. [domain-model]       entity User, VO Email; errors InvalidEmail, EmailAlreadyUsed
3. [domain-event]       UserRegistered
4. [use-case]           RegisterUser, port IUserRepository
5. [persistence]        PgUserRepository, table `users`
6. [integration-event]  RegisterUser emits `user.account.registered`
7. [event-handler]      notification: `user.account.registered` → SendWelcomeEmail
8. [http]               POST /users
9. [api-docs]           POST /users
10. [boundary-review]
Open questions: <only if any>
```
Chains across modules should read as a flow: `use case E → emits F → module G handles → use case H`.

4. Save it to `.claude/plans/<feature-slug>.md` as a checklist (`- [ ] 1. [domain-model] ...`).
5. **STOP.** Wait for approval or edits. Apply edits to the plan file, re-show, wait again.

## Phase 2 — Implement, one step per turn
Fixed skill order (skip what the plan doesn't need; a step may repeat per module/use case):

1. `hex-shared-wrapper` / `hex-config-group` (only if missing)
2. `hex-module-scaffold`
3. `hex-domain-model`
4. `hex-domain-event`
5. `hex-use-case`
6. `hex-persistence-adapter`
7. `hex-integration-event`
8. `hex-query-port`
9. `hex-event-handler` (subscriber's own use case must exist — plan `hex-use-case` for it before this)
10. `hex-http-adapter`
11. `hex-api-docs` (after every `hex-http-adapter` step)
12. `hex-boundary-review` (always last)

For each step:
1. Invoke the step's skill (Skill tool, `hex-<name>`) and follow it. Stay inside that skill's scope.
2. Run its verification (lint/tests/build as the skill says). Fix failures within the same step.
3. Tick the step in the plan file.
4. Report, short:
```
Step 4/9 done — [use-case] RegisterUser
Files: <list>
Checks: lint ✓  test ✓ (N passed)
Self-test: <command / curl / what to look at>
Notes: <pending bindings, assumptions — only if any>
Next: 5. [persistence] PgUserRepository
```
5. **STOP.** Do not start the next step until the developer says continue (`next`, `ok`, `tiếp`...).
   - Feedback → revise inside the current step, re-verify, report again, stop again.
   - Never commit; committing is the developer's call.

## Plan changes
If during a step the plan turns out wrong (missing port, extra exception, different event), stop, show the delta against the plan, update the plan file after approval. Never silently expand scope.

## Done
After `hex-boundary-review`: summarize findings; fixes are new steps only if the developer approves. Final line: plan file path + all steps checked.
