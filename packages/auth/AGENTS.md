# auth

Authentication with better-auth: the server configuration, the React client and the session cookie.

## Layout

- `server`: `createAuth({ db, env: { signUp, autoSignIn, baseURL, secret } })`, the better-auth instance used by the server (email and password, drizzle adapter on the `auth` schema).
- `client`: `authClient` for the app, and `getAuthCookie` that reads the session cookie of a request for the SSR loaders.
- `_constants.ts`: base path, cookie names, the API key and the two-factor configurations.

## Session

- The session is extended with `customSession`: `user.roles` lists the user's role in each organization they are a member of, read from `core.memberships`.
- The cookie prefix is `nullish-auth`. A prefix such as `nullish::auth` breaks the sign-in, because better-auth cannot parse such cookies.

## Two-factor authentication

- TOTP (an authenticator app) with backup codes, provided by better-auth's `twoFactor` plugin and configured with `TWO_FACTOR_CONFIG` (issuer, TOTP digits and period in seconds, backup code length). Its endpoints live under `/auth/two-factor/*` and are served by the server's existing `/auth/*` handler.
- The client never reads `TWO_FACTOR_CONFIG`. `client/constants.ts` exposes only what the UI needs: `TWO_FACTOR_TOTP` (the number of digits, for the code slots) and `TWO_FACTOR_BACKUP_CODE` (the length and where the dash goes).
- better-auth always shows and stores a backup code with a dash after the 5th character (`aB3dE-fG7hJ`), whatever its length. That index is not an option, so `dashIndex` hardcodes it: the UI shows the code in slots without the dash and puts it back before verifying.
- When a user with 2FA signs in with their email and password, better-auth answers `twoFactorRedirect`. The sign-in page then navigates to `/sign-in/two-factor` within the app, the `twoFactorPage` option is not used since it reloads the page. The pending sign-in is kept in a better-auth cookie for a few minutes, so reloading that page works.
- Turning 2FA on, turning it off and generating new backup codes all require the password.

## API keys

- API keys let developers connect their own LLM to the MCP server. They are provided by the `@better-auth/api-key` plugin, configured with `API_KEY_CONFIG`.
- Permissions are a resource with a list of actions, e.g. `{ mcp: ["read", "write"] }`. The enums (`ApiKeyResource`, `ApiKeyAction`) and the Zod schema live in `nullish-schema/auth`, since the server and the client use them too. A new resource is a new `ApiKeyResource` value.
- `permissions` is a server-only property of the plugin: a key created from the client always gets the default permissions (read). A key with other permissions is created by our server with `auth.api.createApiKey`.
- Keys are owned by the user (`references: "user"`), not by an organization: organization-owned keys depend on better-auth's `organization` plugin, which we do not use, and the engine always runs as a user (row-level security). An optional organization is stored in the key's metadata.
