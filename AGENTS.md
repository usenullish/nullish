# AGENTS.md

Guidance for coding agents (and humans) working on this repository. The [README](README.md) covers running the database, the server and the client. This file covers how the code is organized and the conventions to follow. Packages with specific rules have their own `AGENTS.md`, which complements this one.

## Stack

- Bun monorepo (`packages/*`), TypeScript, Zod v4 (codecs), Drizzle ORM on PostgreSQL with row-level security.
- REST API with Hono + `@hono/zod-openapi`, MCP server with `@modelcontextprotocol/sdk` over `@hono/mcp`.
- Client with React Router (SSR loaders).
- Lint and format with `oxlint` and `oxfmt` (`bun run lint`, `bun run fmt`).

## Packages and layers

Dependencies flow top to bottom. A package never imports from a package below it in this list.

| Package           | Owns                                                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `common`          | `Result`/`Option` types, `tryCatch`, asserts (`nonNullish`, `notEmptyString`, …), shared codecs (`DateCodec`, `DateStringCodec`, `BigIntCodec`, `TimestampCodec`) |
| `env`             | Environment helpers (DB url, data dir, migrations folder)                                                                                                         |
| `schema`          | Drizzle tables, Zod record schemas, composites, API schemas and codecs, views, reports                                                                            |
| `db`              | DB instance, migrations, user/admin contexts (row-level security), statement helpers                                                                              |
| `migration`       | Parsers of other accounting software's exports (Bexio) into `Foreign*` entities, and the steps importing them as the user                                         |
| `engine`          | Stores, services (invoice lifecycle, jobs, storage), reports, `EngineError`                                                                                       |
| `admin`           | Admin services, run without a user (only when no other chocie!): the CLI's tooling, the sign-up check and the LLM metering                                        |
| `auth`            | better-auth server and client, session with the user's roles, API keys for the MCP server                                                                         |
| `jobs`, `storage` | Background jobs (PDF generation) and file storage                                                                                                                 |
| `chat`            | LLM chat: the `openai` client and the tool loop over an MCP client, with no access to the engine or the database                                                  |
| `metering`        | LLM usage limits: reserves, releases and records the usage through the admin services, for the server                                                             |
| `server`          | REST resources and MCP tools on top of the engine                                                                                                                 |
| `client`          | API wrappers, services, loaders, forms, routes                                                                                                                    |
| `cli`             | The CLI (organizations, users)                                                                                                                                    |

## Modules

The app is split into modules: core (no prefix), accounting, billing and banking, later payroll and others. A module owns its REST paths, its client routes and its settings.

| Module     | REST and client prefix | Database schema | Covers                                                                   |
| ---------- | ---------------------- | --------------- | ------------------------------------------------------------------------ |
| core       | none                   | `core`          | Organizations, members, invitations, general settings and team           |
| accounting | `/accounting`          | `ledger`        | Accounts, system accounts, periods, journal, reports, VAT                |
| billing    | `/billing`             | `billing`       | Clients, contacts, invoices, lines, document templates, billing settings |
| banking    | `/banking`             | `banking`       | Bank relations, statements, movements                                    |

- REST paths start with the prefix after the organization, e.g. `/organizations/{organizationId}/billing/invoices`. MCP tool names have no prefix.
- Client routes follow the same prefix, e.g. `/orgs/:orgId/billing/invoices`, and the settings of a module live under it: `/billing/settings`, `/banking/settings`, `/accounting/settings` and `/accounting/vat`. The general `/settings` only holds the organization, the team lives under `/team`.
- The settings tables (VAT, billing settings, bank relations, document templates) are still in `core`.

## Conventions

- **Object arguments.** Any function or method with two or more parameters takes one destructured object: `fn({ query, filters })`, never `fn(query, filters)`.
- **Reuse schemas, do not redeclare.** Derive from existing schemas and shapes, e.g. ids via `ApiSchema.Organizations.OrganizationSchema.shape.id` or `SelectInvoicesSchema.shape.clientId`, keys via `ListQueryParamsSchema.keyof()`. No ad hoc `z.uuid()` or hard-coded key lists.
- **Naming.** Bare entity names (`Contacts`, `Lines`, `line_type`), except for joins between two entities (`InvoiceJournal`).
- **Results, not throws.** Stores and services return `Result` (`{ status: "success", result } | { status: "error", err }`). Helpers that parse return a `Result` and the caller decides the error (e.g. the HTTP status).
- **Errors exposed to callers.** Only `EngineError` messages may be shown to users or agents. Any other error is logged and replaced by a generic message.
- **Classes.** Resources, stores, services and loaders are classes with a private constructor and a static `create()`.
- **Comments.** None by default. Only when the code alone cannot explain a non-obvious why (a race, a workaround, a business rule), never to restate what the code does.
- **Scope.** Keep diffs minimal and focused. Do not refactor code or change another package as a side effect. Ask first.

## Domain rules

- **Row-level security.** Every query runs as the user and only sees the organizations they are a member of.
- **Invoices.** Only created as drafts. The status never changes through an update, only through the lifecycle actions (open, pay, void, write off), which also book the journal entries. Invoice lines cannot be updated.
- **Amounts** are integers in the smallest currency unit (cents / Rappen) and `bigint` in code.
- **Exchange rates** are stated between whole units, as a bank quotes them: 1 EUR = 0.93 CHF is `0.93`, 1 JPY = 0.0055 CHF is `0.0055`. An amount is converted to the base currency with `amount × rate × 10^(decimals of the base currency − decimals of the currency)` and rounded once, at the end: `convertToBaseCurrency` in SQL (balances view, VAT declaration), the balance trigger and the pay service all apply it. A journal entry balances when the converted and rounded debits equal the credits, so a conversion difference is a whole number of the base currency's smallest unit and is booked as such (rounding differences, exchange rate gains and losses).
- **VAT declaration amounts.** With the net rate method, the turnover (boxes 200, 299, 322/323) is declared including VAT and the net rate applies to it. With the effective method, it is declared without VAT (boxes 200, 299, 302/303 and the other rates) and the tax is the rate applied to it: the gross amount booked is converted with `gross × rate / (100 + rate)`. The ESTV accepts gross or net amounts for the effective method as long as the return is consistent, the app declares net. The input tax deductions (boxes 400/405) are the tax booked on the input tax accounts (1170, 1171): input tax, import tax and, with the effective method, acquisition tax. Migrated entries (e.g. from Bexio) are only verified with the net rate method, assuming the income postings are gross. With the effective method they are untested: Bexio may book the revenue net with a separate VAT posting, and its VAT rows may not carry the code, so the turnover, the sales tax and the input tax could be wrong. Testers and example exports of effective-method organizations are needed before relying on it.
- **VAT declaration turnover.** Every sale is counted once, by its owner. A journal entry linked to an invoice (open, void, payment, write-off) belongs to the invoice, and the remuneration method decides which of them count: the open entries minus the void ones with the agreed method, the payments with the received method. A journal entry linked to no invoice belongs to itself: its income postings with a VAT code count on its date, with both methods. The Bexio migration therefore links an imported invoice to all its journal entries, its sale entry (reference on the issue date, crediting an income account) as open and its payments as payment, so that the sale is not counted a second time as a plain journal entry.
- **Wire formats.** In JSON, dates are `{ "__date__": "YYYY-MM-DD" }`, timestamps `{ "__timestamp__": "…" }` and amounts `{ "__bigint__": "…" }`. In URL query strings, dates are plain `YYYY-MM-DD`.

## List filters, end to end

Filters are per resource, typed end to end and combined with AND. They are the one feature that crosses every layer. Follow the invoices: `FilterInvoicesSchema` (schema, records) → `DbCollectionInvoices.list` (engine) → `GetInvoicesFiltersSchema` / `GetInvoicesFiltersQuerySchema` (schema, API codecs) → the invoices REST list route and MCP `list_invoices` (server) → the invoices API wrapper, loader and page (client). Each package's `AGENTS.md` details its step.

## Testing

- Tests use `bun:test` and a dedicated test database: `bun run db:run:test`, then `bun test` **from the repository root** (the root `bunfig.toml` preloads the migrations).
- Test files contain no comments. The intent lives in the `describe`/`test` names.
- Test output must stay clean. Error-path tests mock `console.error` (`spyOn(console, "error").mockImplementation(() => {})`, restored in `afterEach`) and assert it was called.
- Prefer fresh fixtures (e.g. a new organization) per block over depending on the rows other tests create or mutate.
