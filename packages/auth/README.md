# auth

Authentication with better-auth: the server configuration, the client and the session cookie.

## Schema

The tables of better-auth (users, sessions, accounts, verifications, two factors, API keys) are declared in the Drizzle schema of `nullish-schema` (`src/db/schemas/auth/auth.ts`). When better-auth or one of its plugins changes its schema, regenerate it from `packages/auth`:

```bash
cd packages/auth
bunx --bun auth generate --config better-auth.config.ts
```

`better-auth.config.ts` only exists for this command and is never used at runtime. Its plugins must match the ones of the server configuration, otherwise their tables are missing from the output. The command warns that the base URL is not set and that the tables are missing: that configuration has neither, both can be ignored.

The schema is written to `auth-schema.ts`. Carry its changes over to `src/db/schemas/auth/auth.ts` in `nullish-schema`, delete `auth-schema.ts`, and create the migration with `bun run db:generate` (see the [db README](../db/README.md)).
