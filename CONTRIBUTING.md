# Contributing

Thanks for your interest in nullish!

## Issues

Please try to keep your issue short. Avoid providing long LLM slop. A few sentences about the bug or your idea are enough to start the discussion, we can dig into the details in the comments.

## Pull requests

While we might revisit this in the future, only collaborators can currently open PRs.

Each pull request is reviewed against the points below.

- **Small and focused**: One concern per pull request. A change that spans several packages is split per package (e.g. the schema, then the engine, then the server, then the client). A feature that takes several steps can use stacked pull requests. No unrelated refactoring, renaming or formatting.
- **Consistent**: New code matches the existing code and its patterns. It reuses the existing schemas, types and components, returns `Result`s and takes object arguments. Shared logic is abstracted and reused, not duplicated.
- **Structured**: A lower layer never imports from a higher one, e.g. the engine never imports from the server. That holds between packages as well as within them, and no package depends on itself through another one. The business rules the database enforces stay in the database, the others live in the engine, not in the server or the client.
- **Secure**: Every query runs as the user, under row-level security. Only `EngineError` messages reach users or agents. No secrets, credentials or real personal or financial data are committed, not even in tests.
- **Tested**: New behavior is covered by tests, with fresh fixtures, no comments and clean output. Lint, format and typecheck pass.

### Title

The title of a pull request follows this format, otherwise a check fails:

```
type(scope): description
```

- **type**: the kind of change, one of `feat`, `fix`, `chore`, `build`, `ci`, `docs`, `style`, `refactor`, `perf` or `test`.
- **scope**: the package or packages touched. It's required.
- **description**: what the change does, in a few words.

For example:

```
feat(engine): close a period with its closing entries
fix(server,client): show the error of a failed import
```

A change that breaks something for existing users adds a `!` before the colon, e.g. `feat(schema)!: rename the legal forms`.

## AI Usage

While we have expectations regarding the quality of issues and pull requests, it's worth noting that we're not against AI, we use it ourselves. Any tool that helps write the code is welcome, and whatever it generates is reviewed against the points above.

## Development

You'll find how to run the database, the API and the client in the [README](README.md).

## Tests

The tests run against a dedicated database. Start it with:

```bash
bun run db:run:test
```

Then run the tests from the root of the repository:

```bash
bun test
```

## Lint, format and typecheck

Before opening a pull request, run:

```bash
bun run lint
bun run fmt
bun run check
```

If you add, rename or remove texts in the client dictionaries, regenerate their types:

```bash
cd packages/client && bun run i18n
```
