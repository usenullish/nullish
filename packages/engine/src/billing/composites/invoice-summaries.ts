import { DbUserContext } from "@usenullish/nullish-db";
import {
  isArrayAtLeastOne,
  isNullish,
  type Option,
  type Result,
  tryCatch,
} from "@usenullish/nullish-common";
import { DbSchema, queryArgsSchema } from "@usenullish/nullish-schema/db";
import { type Records } from "@usenullish/nullish-schema/records";
import { type Composites, CompositesSchema } from "@usenullish/nullish-schema/composites";
import { getColumns } from "drizzle-orm";
import type { DbCollectionStoreInitArgs, DbListArgs, DbStoreInitArgs } from "../../store";
import { loadInvoiceSummaries } from "../_helpers/invoice-summaries";
import { findInvoiceById, listInvoices } from "../_helpers/invoices";
import { parseQueryArgs } from "../../_query/helpers";

type Invoice = Records["Billing"]["Invoices"]["Select"];
type InvoiceSummary = Composites["InvoiceSummaries"]["Select"];
type FilterInvoiceSummaries = Composites["InvoiceSummaries"]["Filter"];

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbInvoiceSummaries extends DbUserContext {
  private constructor(args: DbStoreInitArgs) {
    super(args);
  }

  static create(args: DbStoreInitArgs): DbInvoiceSummaries {
    return new this(args);
  }

  find({ pKey: id }: { pKey: Invoice["id"] }): Promise<Result<Option<InvoiceSummary>>> {
    return tryCatch(async () => {
      return await this._withAuth<Option<InvoiceSummary>>(async (tx) => {
        const invoice = await findInvoiceById({ tx, id });

        if (isNullish(invoice)) {
          return undefined;
        }

        const [summary] = await loadInvoiceSummaries({
          tx,
          organizationId: invoice.organizationId,
          invoices: [invoice],
        });

        return summary;
      });
    });
  }
}

export class DbCollectionInvoiceSummaries extends DbUserContext {
  readonly #organizationId: SelectOrganizations["id"];
  readonly #queryArgsSchema = queryArgsSchema(
    Object.keys(getColumns(DbSchema.Billing.Invoices.InvoicesSchema)) as [string, ...string[]],
  );

  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super(args);

    this.#organizationId = args.foreignKeyId;
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionInvoiceSummaries {
    return new this(args);
  }

  list({
    filters,
    pagination,
    sort,
  }: DbListArgs<string, FilterInvoiceSummaries>): Promise<Result<InvoiceSummary[]>> {
    return tryCatch(async () => {
      const queryArgs = parseQueryArgs({
        args: { pagination, sort },
        schema: this.#queryArgsSchema,
        table: DbSchema.Billing.Invoices.InvoicesSchema,
        pKey: DbSchema.Billing.Invoices.InvoicesSchema.id,
      });

      const parsedFilters = isNullish(filters)
        ? undefined
        : CompositesSchema.InvoiceSummariesSchema.FilterInvoiceSummariesSchema.parse(filters);

      return await this._withAuth<InvoiceSummary[]>(async (tx) => {
        const invoices = await listInvoices({
          tx,
          organizationId: this.#organizationId,
          filters: parsedFilters,
          ...queryArgs,
        });

        if (!isArrayAtLeastOne(invoices)) {
          return [];
        }

        return await loadInvoiceSummaries({ tx, organizationId: this.#organizationId, invoices });
      });
    });
  }
}
