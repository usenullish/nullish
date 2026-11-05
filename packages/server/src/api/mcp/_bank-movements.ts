import {
  DbCollectionMovementSummaries,
  DbCollectionMovements,
  DbMovements,
  IgnoreMovementService,
  ReconcileMovementService,
} from "@usenullish/nullish-engine/banking";
import {
  ApiSchema,
  CommonSchema,
  encodeBankMovementSummaryResponse,
  encodeBankMovementResponse,
} from "@usenullish/nullish-schema/server";
import { nonNullish } from "@usenullish/nullish-common";
import type { DbCollectionStore } from "@usenullish/nullish-engine";
import type { Records } from "@usenullish/nullish-schema/records";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import { DESTRUCTIVE_TOOL, READ_ONLY_TOOL, McpTools, type McpToolsInitArgs } from "./_tools";

type SelectMovements = Records["Banking"]["Movements"]["Select"];
type FilterMovements = Records["Banking"]["Movements"]["Filter"];

export class McpToolsBankMovements extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsBankMovements {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListBankMovements();
    this.#registerGetBankMovement();
    this.#registerListBankMovementSummaries();
  }

  override registerWriteTools() {
    this.#registerReconcileBankMovement();
    this.#registerIgnoreBankMovement();
  }

  #registerListBankMovements() {
    this.registerTool({
      title: "list_bank_movements",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the movements of a bank relation, as imported from its bank statements. A positive amount is money that came into the account, a negative amount money that left it.",
      inputSchema: z.strictObject({
        bankRelationId: ApiSchema.BankRelations.BankRelationsResponseSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.BankMovements.GetBankMovementsFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(ApiSchema.BankMovements.GetBankMovementsResponseSchema),
      fn: async ({ bankRelationId, query, filters }) => {
        const store: DbCollectionStore<SelectMovements, unknown, string, FilterMovements> =
          DbCollectionMovements.create({
            ...this._args,
            foreignKeyId: bankRelationId,
          });

        const result = await store.list({ ...query, filters });

        return this.mapResult(result, (bankMovements) => ({
          bankMovements: bankMovements.map(encodeBankMovementResponse),
        }));
      },
    });
  }

  #registerGetBankMovement() {
    this.registerTool({
      title: "get_bank_movement",
      annotations: READ_ONLY_TOOL,
      description: "Returns a bank movement by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.BankMovements.BankMovementSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.BankMovements.GetBankMovementResponseSchema),
      fn: async ({ id }) => {
        const result = await DbMovements.create(this._args).find({ pKey: id });

        return this.mapResult(result, (bankMovement) => ({
          bankMovement: nonNullish(bankMovement)
            ? encodeBankMovementResponse(bankMovement)
            : bankMovement,
        }));
      },
    });
  }

  #registerListBankMovementSummaries() {
    this.registerTool({
      title: "list_bank_movement_summaries",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the movements of a bank relation, each with the open or paid invoice suggested by its payment reference (QR or RF creditor reference), or null. A paid invoice means the payment was probably already booked by hand: do not pay it again, ignore the movement or book it on an account. Filter on the unreconciled status to get what remains to reconcile, then reconcile each movement with reconcile_bank_movement or ignore it with ignore_bank_movement.",
      inputSchema: z.strictObject({
        bankRelationId: ApiSchema.BankRelations.BankRelationsResponseSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.BankMovementSummaries.GetBankMovementSummariesFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(
        ApiSchema.BankMovementSummaries.GetBankMovementSummariesResponseSchema,
      ),
      fn: async ({ bankRelationId, query, filters }) => {
        const result = await DbCollectionMovementSummaries.create({
          ...this._args,
          foreignKeyId: bankRelationId,
        }).list({ ...query, filters });

        return this.mapResult(result, (bankMovementSummaries) => ({
          bankMovementSummaries: bankMovementSummaries.map(encodeBankMovementSummaryResponse),
        }));
      },
    });
  }

  #registerReconcileBankMovement() {
    this.registerTool({
      title: "reconcile_bank_movement",
      annotations: DESTRUCTIVE_TOOL,
      description:
        "Reconciles an unreconciled bank movement and books it in the journal, on the date the bank booked it. With type invoice, the movement, which must be money in, pays the open invoice. With type account, the movement is booked between the ledger account of its bank relation and the given account, optionally with a VAT rate (see list_vat_rates) on the given account, which books the VAT postings as for a journal entry. Only movements in the base currency are supported for now.",
      inputSchema: z.strictObject({
        id: ApiSchema.BankMovements.BankMovementSchema.shape.id,
        values: ApiSchema.BankMovementsReconcile.ReconcileBankMovementRequestSchema,
      }),
      outputSchema: toJsonSchema(
        ApiSchema.BankMovementsReconcile.ReconcileBankMovementResponseSchema,
      ),
      fn: async ({ id, values }) => {
        const result = await ReconcileMovementService.create({
          ...this._args,
          movementId: id,
        }).reconcile(values);

        return this.mapResult(result, (bankMovement) => ({
          bankMovement: encodeBankMovementResponse(bankMovement),
        }));
      },
    });
  }

  #registerIgnoreBankMovement() {
    this.registerTool({
      title: "ignore_bank_movement",
      annotations: DESTRUCTIVE_TOOL,
      description:
        "Ignores an unreconciled bank movement, which books nothing. It cannot be undone.",
      inputSchema: z.strictObject({
        id: ApiSchema.BankMovements.BankMovementSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.BankMovementsIgnore.IgnoreBankMovementResponseSchema),
      fn: async ({ id }) => {
        const result = await IgnoreMovementService.create({
          ...this._args,
          movementId: id,
        }).ignore();

        return this.mapResult(result, (bankMovement) => ({
          bankMovement: encodeBankMovementResponse(bankMovement),
        }));
      },
    });
  }
}
