# engine

Data access and business logic: stores, services and reports.

## Stores

- `DbX` stores work by id (`findById`, `update`). `DbCollectionX` stores work within a parent (`list`, `insert`), e.g. the invoices of an organization or the lines of an invoice. They implement `DbStore` / `DbCollectionStore` (`store.ts`).
- All reads go through `DbRecords._query` (or the journal's `#queryMany`), which validates the pagination, the sort and the filters inside the same `tryCatch`, and runs under row-level security.
- **Filters.** A store's `list({ filters, ...args }: DbListArgs<SortField, Filter>)` passes `filters: { values, schema, where }` to `_query` / `_queryWithForeignKeyId`. The `where` builder uses `this._table`, `nonNullish` for exact matches and `notEmptyString` + `ilikeContains({ column, value })` for text search. The filters are parsed and ANDed with the parent foreign key. See `DbCollectionInvoices`.
- `ilikeContains` escapes `%`, `_` and `\` so that a search matches literally. The value is always a bound parameter.

## Services

- Invoice lifecycle services (`OpenInvoiceService`, `PayInvoiceService`, `VoidInvoiceService`, `UncollectibleInvoiceService`) assert the invoice status, book the journal entries and record the invoice-journal links.
- `CreateJournalService` / `UpdateJournalService` save a journal entry and generate the VAT postings of its input tax, acquisition tax, sales tax and net rate tax postings, linked in `ledger.posting_manual_vat_postings`. The journal stores stay plain CRUD.
- `JobsInvoiceService` triggers the PDF generation job and reads its state. `StorageInvoiceService` streams the generated document.

## Errors

Business errors extend `EngineError` (`src/errors.ts`) and carry a message meant for users or agents (e.g. "Unexpected status: Invoice … is draft and not open"). Anything else (database errors, invalid array lengths, …) is not exposed.

## Tests

- Fixtures live in `tests/_test-utils.ts` (`resetDb`, `seedUsers`, `createOrganization`, `createClient`, `createDraftInvoice`, `leafAccountId`, `waitFor`, …).
- Some store test files truncate their table in a top-level `beforeEach`. A nested block in those files must seed in its own `beforeEach`, not `beforeAll`, or its rows are wiped before each test.
- Seeded data has constraints worth knowing: the chart of accounts already uses numeric codes, and a `net_rate_tax` VAT rate requires a `netRate`.
