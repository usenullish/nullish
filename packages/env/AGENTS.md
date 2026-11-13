# env

Environment settings of the database, the data dir (for jobs) and the LLM. Read them through these helpers rather than `process.env`.

- No defaults per environment in code: development values live in `../../.env.development` (not committed), production values in the deployment (`docker-compose.prod.yml`), and the test values are set by the root `test-setup.ts` when missing.
- `envDbUrl`: builds the PostgreSQL url from `NULLISH_DB_HOST`, `NULLISH_DB_PORT`, `NULLISH_DB_USERNAME`, `NULLISH_DB_PASSWORD` (all required) and `NULLISH_DB_NAME` (defaults to `nullish`).
- `envDataDir`: where files and generated documents are stored, `.nullish/data` in dev and `/data` in production (mount a volume there).
- `envDbMigrationsFolder`: the location of the `db` migrations, computed from the environment since it is a path of the repository, not a setting.
- `envLlmEnabled`, `envLlmUrl`, `envLlmChatModel`, `envLlmApiKey`: the OpenAI-compatible endpoint, model and API key of the chat, from `NULLISH_LLM_URL`, `NULLISH_LLM_CHAT_MODEL` and `NULLISH_LLM_API_KEY`. The chat is optional: it is enabled only when the three are defined.
- `envLlmChatTokenLimit`: an optional usage limit per user (`NULLISH_LLM_CHAT_TOKEN_LIMIT`, `NULLISH_LLM_CHAT_TOKEN_LIMIT_PERIOD`).
- `envSignUp`: `NULLISH_AUTH_SIGN_UP` (`true`, `false` or `invite_only`, the default).
- `envAppUrl`: the public URL of the app (`NULLISH_APP_URL`, required), used as the base URL of better-auth and to build the links sent by email.
- `envAuthUrl`: the base URL of better-auth, the app URL for now. Use it for the authentication so that it can get its own URL later without changing the callers.
- `envAuthSecret`: the secret of better-auth (`NULLISH_AUTH_SECRET`, required). The server passes it and the app URL to `createAuth`, so better-auth's own `BETTER_AUTH_*` variables are not used.
- `envMailFrom`, `envMailFromName`, `envMailSmtpUrl`: the sender address of the emails (`NULLISH_MAIL_FROM`, a valid email), its optional display name (`NULLISH_MAIL_FROM_NAME`) and the SMTP server of `SmtpMailProvider` (`NULLISH_MAIL_SMTP_URL`, an `smtp://` or `smtps://` URL). Email is optional: `envMailEnabled` is true only when the address and the URL are defined. In development, Mailpit listens on `smtp://localhost:1025`.
- Every variable starts with `NULLISH_`, the client's included (`NULLISH_API_URL`, `NULLISH_ENVIRONMENT`, read at runtime by the server-side rendering only). The exceptions are `NODE_ENV`, and `HOST` and `PORT` read by `react-router-serve`.
