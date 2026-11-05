# server

REST API and MCP server on top of the engine.

## REST resources

- One resource per file in `src/api/resources`. Resources extend `RouteResource` and declare `defineList`, `defineGetById`, `defineCreate` and `defineUpdate` with the route factories of `_factories/crud-route-config.ts` and the generic handlers of `src/api/handlers`. CRUD resources, whose store implements `DbDeletableStore`, extend `CrudResource` and also declare `defineDelete` (`defineDeleteRoute`, `defineDeleteHandler`: 204, or 404 when nothing was deleted). Actions (e.g. `/billing/invoices/{id}/pay`) extend `Resource`.
- List routes accept filters: `defineListRoute({ request: { query: { filters: { schema } } } })` with the resource's `Get…FiltersQuerySchema`, and `filtersSchema` on the list handler. The handler splits the list query params from the filters and answers 400 when they are invalid.
- Responses are encoded with the API codecs (`encodeAuditFieldsResponse`, `encodeInvoiceResponse`, `encodeWithCodecs(…)`).

## MCP

- One class per area in `src/api/mcp`, extending `McpTools` and implementing `registerTools()`, registered in `McpHandler`. The server is stateless: a new one is created per request.
- Each tool declares its `annotations` (`READ_ONLY_TOOL`, `WRITE_TOOL`, `UPDATE_TOOL`, `DELETE_TOOL`, `DESTRUCTIVE_TOOL`), an input schema and the API response schema as output (`toJsonSchema(…)`). As in the MCP spec, destructive means modifying existing data, as opposed to only adding: creations are `WRITE_TOOL`, updates `UPDATE_TOOL` and deletions `DELETE_TOOL` (both destructive and idempotent) and the invoice lifecycle actions (open, pay, void, write off) `DESTRUCTIVE_TOOL`. Annotations are hints for MCP clients, not enforcement.
- Tools reuse the stores, services and encoders of the matching REST resource, and return encoded (wire) values. Output schemas are converted to their encoded JSON shape once and cached by `McpOutputSchemas`.
- Tool errors are logged. Only `EngineError` messages and input validation issues are returned to the agent, anything else becomes `Failed to execute <tool>.`
- Tests call the endpoint through Hono with `__useJsonResponseForTest__: true` (`tests/api/mcp`).

## Chat

- `POST /chat` (`src/api/resources/_chat.ts`) takes `ApiSchema.Chat.ChatRequestSchema` (the organization and the conversation) and streams the events of `nullish-chat` as server-sent events.
- The chat gets an in-process MCP client (`McpHandler.create({ … }).connect()`) and goes through the same row-level security as any other agent.
