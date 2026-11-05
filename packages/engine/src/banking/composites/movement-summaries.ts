import { DbUserContext } from "@usenullish/nullish-db";
import type { Tx } from "@usenullish/nullish-db";
import {
  isArrayAtLeastOne,
  isEmptyString,
  isNullish,
  type Result,
  tryCatch,
} from "@usenullish/nullish-common";
import {
  BankMovementStatus,
  DbSchema,
  InvoiceStatus,
  queryArgsSchema,
} from "@usenullish/nullish-schema/db";
import { type Records } from "@usenullish/nullish-schema/records";
import { type Composites, CompositesSchema } from "@usenullish/nullish-schema/composites";
import { getColumns } from "drizzle-orm";
import type { DbCollectionStoreInitArgs, DbListArgs } from "../../store";
import { getBankRelation } from "../../core/_helpers/bank-relations";
import { loadInvoiceSummaries } from "../../billing/_helpers/invoice-summaries";
import { listInvoicesByPaymentReferences } from "../../billing/_helpers/invoices";
import { listMovements } from "../_helpers/movements";
import { toPaymentReference } from "../_helpers/payment-reference";
import { parseQueryArgs } from "../../_query/helpers";

type MovementSummary = Composites["MovementSummaries"]["Select"];
type FilterMovementSummaries = Composites["MovementSummaries"]["Filter"];
type InvoiceSummary = Composites["InvoiceSummaries"]["Select"];

type Movement = Records["Banking"]["Movements"]["Select"];
type Invoice = Records["Billing"]["Invoices"]["Select"];
type PaymentReference = NonNullable<Invoice["paymentReference"]>;

type SelectBankRelations = Records["Core"]["BankRelations"]["Select"];

export class DbCollectionMovementSummaries extends DbUserContext {
  readonly #bankRelationId: SelectBankRelations["id"];
  readonly #queryArgsSchema = queryArgsSchema(
    Object.keys(getColumns(DbSchema.Banking.Movements.MovementsSchema)) as [string, ...string[]],
  );

  private constructor(args: DbCollectionStoreInitArgs<SelectBankRelations["id"]>) {
    super(args);

    this.#bankRelationId = args.foreignKeyId;
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectBankRelations["id"]>,
  ): DbCollectionMovementSummaries {
    return new this(args);
  }

  list({
    filters,
    pagination,
    sort,
  }: DbListArgs<string, FilterMovementSummaries>): Promise<Result<MovementSummary[]>> {
    return tryCatch(async () => {
      const queryArgs = parseQueryArgs({
        args: { pagination, sort },
        schema: this.#queryArgsSchema,
        table: DbSchema.Banking.Movements.MovementsSchema,
        pKey: DbSchema.Banking.Movements.MovementsSchema.id,
      });

      const parsedFilters = isNullish(filters)
        ? undefined
        : CompositesSchema.MovementSummariesSchema.FilterMovementSummariesSchema.parse(filters);

      return await this._withAuth<MovementSummary[]>(async (tx) => {
        const movements = await listMovements({
          tx,
          bankRelationId: this.#bankRelationId,
          filters: parsedFilters,
          ...queryArgs,
        });

        const { paymentReferencesByMovement, uniquePaymentReferences } =
          this.#mapSuggestablePaymentReferences({
            movements,
          });

        const invoices = await this.#loadSuggestedInvoices({
          tx,
          paymentReferences: uniquePaymentReferences,
        });

        return movements.map((movement) => {
          const paymentReference = paymentReferencesByMovement.get(movement.id);

          return CompositesSchema.MovementSummariesSchema.SelectMovementSummariesSchema.parse({
            movement,
            suggestedInvoice: isNullish(paymentReference)
              ? null
              : (invoices.get(paymentReference) ?? null),
          });
        });
      });
    });
  }

  async #loadSuggestedInvoices({
    tx,
    paymentReferences,
  }: {
    tx: Tx;
    paymentReferences: PaymentReference[];
  }): Promise<Map<PaymentReference, InvoiceSummary>> {
    // If there is not a single payment references we already know there is no suggested invoices
    if (!isArrayAtLeastOne(paymentReferences)) {
      return new Map();
    }

    return await this.#loadInvoicesByPaymentReference({ tx, paymentReferences });
  }

  async #loadInvoicesByPaymentReference({
    tx,
    paymentReferences,
  }: {
    tx: Tx;
    paymentReferences: [PaymentReference, ...PaymentReference[]];
  }): Promise<Map<PaymentReference, InvoiceSummary>> {
    const { organizationId } = await getBankRelation({
      tx,
      id: this.#bankRelationId,
    });

    const invoices = await listInvoicesByPaymentReferences({
      tx,
      organizationId,
      paymentReferences,
      statuses: [InvoiceStatus.OPEN, InvoiceStatus.PAID],
    });

    if (!isArrayAtLeastOne(invoices)) {
      return new Map();
    }

    const summaries = await loadInvoiceSummaries({
      tx,
      organizationId,
      invoices,
    });

    return new Map(
      summaries.flatMap((summary) =>
        isNullish(summary.invoice.paymentReference)
          ? []
          : [[summary.invoice.paymentReference, summary] as const],
      ),
    );
  }

  #mapSuggestablePaymentReferences({ movements }: { movements: Movement[] }): {
    paymentReferencesByMovement: Map<Movement["id"], PaymentReference>;
    uniquePaymentReferences: PaymentReference[];
  } {
    const paymentReferencesByMovement = new Map(
      movements
        .filter(
          ({ status, amount }) =>
            // Only the movement that have not yet been reconciled and are positive can potentially be
            // reconciled with an invoice. User might call the summary list with the unreconciled filter included.
            status === BankMovementStatus.UNRECONCILED && amount > 0n,
        )
        .flatMap(({ id, creditorReference }) => {
          const paymentReference = isEmptyString(creditorReference)
            ? undefined
            : toPaymentReference({ creditorReference });

          return isNullish(paymentReference) ? [] : [[id, paymentReference] as const];
        }),
    );

    const uniquePaymentReferences = [...new Set(paymentReferencesByMovement.values())];

    return {
      paymentReferencesByMovement,
      uniquePaymentReferences,
    };
  }
}
