# admin

Code that runs outside of a user's row-level security: the tooling of the CLI and the checks that happen before any user exists.

## Last resort

Everything else belongs in the engine, which runs as the user and only sees their organizations. Add code here only when an action cannot run as a user, for example:

- there is no user yet: `SignUpService` checks whether anyone may sign up;
- the action spans every organization or belongs to the operator of the instance: `DeleteOrganizationService` deletes the organizations marked as deleted;
- the CLI tooling, e.g. the Bexio migration.

Row-level security is bypassed, but every trigger and constraint still applies. A rule the database enforces does not need to be checked again here, and it cannot be skipped either.

## Structure

- `services/` hold classes that extend `AdminServiceContext`, with a private constructor and a static `create({ db })`. `_withDbContext` runs a transaction without a user and returns a `Result`.
- `helpers.ts` files hold functions that take a `tx` and return a `Result`. The CLI runs them through `DbAdminContext.exec` (no user) or `execWithUser` (as a user, row-level security applies).
- `_helpers/` hold the private helpers of a module's services. They throw, the service turns the error into a `Result`.

## Pagination

The reads are not paginated: the list helpers and `DeleteOrganizationService.list` return every matching row in one query. This is fine as long as they are scoped to one organization or the result stays small. A read that spans every organization or a table that keeps growing should page through it, `selectMany` takes a `pagination`.

## Tests

Tests live in `tests/`, mirroring `src/`, and use the fixtures of `tests/_test-utils.ts`.
