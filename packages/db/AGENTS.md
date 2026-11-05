# db

Database connection, migrations, user contexts and statement helpers.

## Contexts and row-level security

- `DbUserContext` runs queries in a transaction scoped to a user (`_withAuth`), which sets the current user for the row-level security policies (`auth.current_user_id()`). Engine stores extend it.
- `DbAdminContext` bypasses row-level security (`exec`), impersonates a given user (`execWithUser`) or runs outside of a transaction (`execSystem`). Only for admin tooling.

## Migrations and triggers

- Migrations live in `migrations/`. Tests run them through the root `bunfig.toml` preload.
- Adding a migration follows the [README](README.md): the command, the type prefix of its name, and the four parts of a custom migration (its SQL, a comment detailing the rule, a row in the list, tests). A released migration is never edited.
- A lot of business rules are enforced by triggers and constraints, not only by the engine. The README lists them.
- **Rule violations.** A trigger that enforces a rule the user can act on (e.g. no period covers the date, the entry does not balance) raises with `USING ERRCODE = 'R0001'`. `R0001` is a custom SQLSTATE of this project: the server answers these errors as rejected with their message (`RULE_VIOLATION` in `packages/server/src/api/_errors.ts`). Any other `RAISE EXCEPTION` is an internal error and is not exposed.
- **Creating an organization** runs triggers that seed the admin membership, the full chart of accounts of its legal form, the system accounts, the accounting settings, the billing settings and a first period covering the current calendar year. It requires the current user id to be set. The `createOrganization` test helpers delete that period, so each test sets up the periods it needs.
- **Charts of accounts** are seeded from bexio's reference charts into `templates.ledger_accounts`, one per legal form. GmbH (`llc`) and AG (`corporation`) share bexio's small AG/GmbH chart. A sole proprietorship (`sole_proprietorship`) gets bexio's own chart, with owner's equity instead of share capital and reserves: 2800 capital, 2820 contributions and withdrawals, 2850 private account, and the annual result on 2891 instead of 2979. Account names come from the client dictionaries, keyed by code only, so a code has the same name in every chart.
- **VAT methods** (`core.vat_methods`) hold the payment and remuneration methods of a fiscal year (ledger period), one row per period. Creating them runs triggers that generate the VAT periods of the year and seed rates from `templates.vat_rates`: the common rates when the organization has no rate yet, and the rates of a payment method the first time a year uses it (also when switching method). The net rate tax is not seeded. Opening a new ledger period copies the VAT methods of the previous year. They require the VAT settings of the organization, changing the payment method or the dates of the period regenerates the VAT periods of the year, and the methods are locked once an invoice or a journal entry of the year uses VAT. A posting with a VAT rate requires the VAT methods of its year, and the type of the rate must be allowed with their payment method (net rate tax with the net rate method; sales, input and import tax with the effective method; the others with both), checked again when the date of its entry changes.
- Every insert, update and delete on the business tables is recorded in `audit.logs` with the old and new rows.

## Tests

Trigger and constraint tests live in `tests/migrations/rules`, one file per rule.
