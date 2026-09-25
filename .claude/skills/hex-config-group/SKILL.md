---
name: hex-config-group
description: Add a new config group (or new keys to an existing group) under src/config with a zod schema, typed T<Group>Config and registerAs factory, and register it in configGroups/TConfigMap. Use when code needs new environment-driven settings.
---

# hex-config-group

**Scope:** `src/config/*`, `.env.example`, `.env` (local only). **Out of scope:** code that consumes the config.

## Rules
- One file per group: `src/config/<group>.config.ts`. Group name = camelCase namespace (`auth`, `storage`, `mail`).
- Env var names UPPER_SNAKE with group prefix (`AUTH_JWT_SECRET`). Config keys camelCase.
- Numbers/booleans come as strings: use `z.coerce.number()`, and `z.enum(['true','false']).transform(v => v === 'true')` for booleans.
- Required secrets: no default. Non-secret: sensible default.
- `process.env` is read ONLY inside the factory.

## Template
```ts
import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const authConfigSchema = z.object({
  jwtSecret: z.string().min(32),
  jwtExpiresIn: z.string().default('15m'),
});

export type TAuthConfig = z.infer<typeof authConfigSchema>;

export const authConfig = registerAs('auth', (): TAuthConfig =>
  authConfigSchema.parse({
    jwtSecret: process.env.AUTH_JWT_SECRET,
    jwtExpiresIn: process.env.AUTH_JWT_EXPIRES_IN,
  }),
);
```

## Steps
1. Create/extend the group file (see `src/config/database.config.ts` for reference).
2. `src/config/index.ts`: add `export * from './<group>.config'`, append to `configGroups`, add `<group>: T<Group>Config` to `TConfigMap`.
3. `.env.example`: add keys under a `# <group>` header with safe placeholder values. Mirror into `.env` if it exists (never commit `.env`).
4. `npm run build`.

## Report
Group, keys (env name → config key → default), files changed. Tell dev which values to set in `.env`. Stop.
