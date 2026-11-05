# client

React Router app, rendered on the server.

## Folders

Imports flow top to bottom. A folder never imports from a folder below it in this list.

| Folder           | Owns                                                                                                                                                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/ui`         | Generic UI primitives (buttons, cards, badges, …) and their hooks. No app logic, no texts.                                                                                                                                                                                                  |
| `app/lib`        | The business side, plain TypeScript talking to the API: API wrappers, services, env variables (`env.ts`), cookie schemas, utils. No React.                                                                                                                                                  |
| `app/context`    | The business data of the app: route loaders (`server`, `loaders`), form actions (`form`), the React contexts holding loaded data (`contexts`, e.g. organizations, currencies, accounts), middlewares. Never imports from `kit`.                                                             |
| `app/kit`        | App-wide infrastructure, unrelated to the business and the API: one folder per concern (`theme`, `i18n`, `privacy`, `notifications`, `environment`, …) holding its types, context, provider and services, plus the shared hooks (`format`, `data`, `locale`) reading what `context` loaded. |
| `app/components` | Feature components grouped by module or page (`billing`, `banking`, `journal`, `auth`, …), shared ones in `core` and the layouts in `layout`.                                                                                                                                               |
| `app/routes`     | Route modules: loader, action and the page rendering the components.                                                                                                                                                                                                                        |

Anything about the business (organizations, invoices, accounts, …) and anything talking to the API goes in `lib` and `context`. A concern of the app itself, used across every page (theme, language, environment, …), goes in its own `kit` folder with everything it needs.

## Layers

- `app/lib/api`: API wrappers, one per resource (`*.ssr.api.ts` for server-side calls with the cookie, `*.api.ts` for client-side submits). List calls encode the query and the filters with `listSearchParams({ query, filters })`.
- `app/lib/services`: one class per resource (`XService extends Service`), returning `Result`. Methods mirror the API (`list`, `listAll`, `getById`, `submit`, `update`, and the actions such as `open`, `pay`, `void`).
- `app/context/server`: loaders (`XServer extends ServerLoader`) holding a `#service = XService.create()`.
- `app/context/form`: form actions, calling `XService.create().method(…)`.

Services and API wrappers declare their methods as arrow properties (`list = async (…) => …`) because loaders pass them as references (`loaderFn: this.#service.list`) and a regular method would lose `this`.

## Navigation

- Links are built with the path classes of `app/navigation.ts`, never by hand: `OrganizationPath` for core pages, `BillingPath`, `BankingPath` and `AccountingPath` for the modules (one class per module, which only sets its prefix), e.g. ``BillingPath.create({ organizationId }).to({ path: `/invoices/${id}` })``. Settings pages use `toSettings`, e.g. `AccountingPath.create({ organizationId }).toSettings({ path: "/periods" })`.
- `OrganizationRootPath` adds the conversation links and the active sidebar item, which only make sense without a module prefix.
- The breadcrumb `back` of a route handle returns the full path built with the same classes.
- `NAVIGATION` and the tab constants hold paths relative to the organization, compared with the URL to find the active item and tab.

## Lists

- `_loadListNested` / `_loadListWithId` read the list query (`limit`, `offset`, `sort`, `direction`) and, when given a `filtersSchema`, the filters from the page URL. Empty values are not filters, invalid filters answer 400.
- The page URL is the state of a list: `SortableHeader`, `Pagination` and `ListFilters` all read and write the search params. Filtering and sorting drop the `offset` so that the result restarts from the first page.
- Filter controls: `ListFilters` with `FilterSelect` (options from the schema enums), `FilterDate` and `FilterText` (`components/core/list-filters.tsx`).

## i18n

- Every text shown to users comes from the dictionaries in `app/kit/i18n`: `en.json`, `fr.json`, `de.json` and `it.json`. A new or changed text is always added in the four languages, never in English only.
- The tone is fresh and casual, and the user is addressed informally in every language: "tu" in French and Italian, "du" in German (lowercase "du", "dein").
- `en.json` is the source of the schemas. After adding, renaming or removing keys, run `bun run i18n` in `packages/client` to regenerate `i18n.ts` (Zod schemas and the inferred `I18n` type). The loaders parse every language with it, so a dictionary with a missing or extra key fails to load.
- Components read the texts with `const { i18n } = useI18n();`, e.g. `i18n.core.action.submit`. Values inside a text are placeholders replaced in the component with `replacePlaceholders` (`kit/i18n/i18n.utils.ts`), e.g. `replacePlaceholders(i18n.core.label.page, { "{page}": … })`.
- Translations use Swiss terminology: MWST / TVA / IVA, and "Strasse" without "ß".
