# schema

Drizzle tables and every Zod schema of the project, from the database rows to the API wire formats.

## Layout

- `db`: Drizzle tables, enums (`constants`), views and materialized views, query args (`_query.ts`).
- `records`: one schema per table and operation: `Select…`, `Insert…`, `Update…`, `Filter…`. Their types are exposed as `Records[Domain][Entity]["Select" | "Insert" | "Update" | "Filter"]`.
- `composites`: multi-table shapes, e.g. the journal (an entry with its postings).
- `server`: API schemas and codecs (`ApiSchema.X`), the `Api[X]["Server" | "Client"]` types and the shared `CommonSchema` (list query, route params).

## Records

- Enum columns are refined with a `refine…Enums` object because Drizzle does not infer them.
- Update schemas make every field optional except `version` (optimistic locking): `.partial().required(UPDATE_REQUIRED_FIELDS)`. Without `.partial()`, refined enums would stay required.
- `Filter…Schema` holds the decoded list filters of a resource. Reuse the enum refinements and the select `shape`s, e.g. `SelectInvoicesSchema.shape.clientId.optional()`.

## API schemas and codecs

- Request and response schemas wrap the records with codecs, so that JSON carries encoded values: `DateCodec` (`{ __date__ }`), `BigIntCodec` (`{ __bigint__ }`) and the audit fields (`{ __timestamp__ }`).
- Filters have two codecs per resource: `Get…FiltersSchema` for JSON (MCP, dates with `DateCodec`) and `Get…FiltersQuerySchema` for URL query strings (REST and client, dates with `DateStringCodec`). Both decode to the same `Filter` type.
- The invoice update request omits `status`. Status changes only happen through the lifecycle actions.
