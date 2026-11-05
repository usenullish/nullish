import { DbCollectionBankRelations, DbBankRelations } from "@usenullish/nullish-engine/core";
import type { DbCollectionStore } from "@usenullish/nullish-engine";
import {
  ApiSchema,
  CommonSchema,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import { nonNullish } from "@usenullish/nullish-common";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import {
  DELETE_TOOL,
  WRITE_TOOL,
  READ_ONLY_TOOL,
  McpTools,
  type McpToolsInitArgs,
  UPDATE_TOOL,
} from "./_tools";

type SelectBankRelations = Records["Core"]["BankRelations"]["Select"];

export class McpToolsBankRelations extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsBankRelations {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListBankRelations();
    this.#registerGetBankRelation();
  }

  override registerWriteTools() {
    this.#registerCreateBankRelation();
    this.#registerUpdateBankRelation();
    this.#registerDeleteBankRelation();
  }

  #registerListBankRelations() {
    this.registerTool({
      title: "list_bank_relations",
      annotations: READ_ONLY_TOOL,
      description:
        'Returns the bank relations of an organization, i.e. its bank accounts at its banks, shown to users as "bank accounts": their name, IBAN, invoice IBAN, currency and the ledger account they are booked on. The IBAN is the one of the account, which the bank statements name; the optional invoice IBAN is printed on the invoices instead, e.g. a Swiss QR-IBAN (shown to users as "QR-IBAN"). A bank relation is not a ledger account: its ledger account (accountId, e.g. 1020 Bank) belongs to the chart of accounts (list_accounts). When the user talks about a bank account, it is a bank relation, unless they mean the account of the chart of accounts.',
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.BankRelations.GetBankRelationsResponseSchema),
      fn: async ({ organizationId, query }) => {
        const store: DbCollectionStore<SelectBankRelations, unknown, string> =
          DbCollectionBankRelations.create({
            ...this._args,
            foreignKeyId: organizationId,
          });

        const result = await store.list(query);

        return this.mapResult(result, (bankRelations) => ({
          bankRelations: bankRelations.map(this.#encodeResponse),
        }));
      },
    });
  }

  #registerGetBankRelation() {
    this.registerTool({
      title: "get_bank_relation",
      annotations: READ_ONLY_TOOL,
      description: "Returns a bank relation, i.e. a bank account of the organization, by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.BankRelations.GetBankRelationsRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.BankRelations.GetBankRelationResponseSchema),
      fn: async ({ id }) => {
        const result = await DbBankRelations.create(this._args).find({ pKey: id });

        return this.mapResult(result, (bankRelation) => ({
          bankRelation: nonNullish(bankRelation)
            ? this.#encodeResponse(bankRelation)
            : bankRelation,
        }));
      },
    });
  }

  #registerCreateBankRelation() {
    this.registerTool({
      title: "create_bank_relation",
      annotations: WRITE_TOOL,
      description:
        "Creates a bank relation, i.e. a bank account, for an organization. The IBAN is given in uppercase without spaces. The accountId is the asset account of the ledger, without child accounts, on which the money of this bank relation is booked.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        values: ApiSchema.BankRelations.CreateBankRelationRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.BankRelations.CreateBankRelationResponseSchema),
      fn: async ({ organizationId, values }) => {
        const result = await DbCollectionBankRelations.create({
          ...this._args,
          foreignKeyId: organizationId,
        }).insert({ values });

        return this.mapResult(result, (bankRelation) => ({
          bankRelation: this.#encodeResponse(bankRelation),
        }));
      },
    });
  }

  #registerUpdateBankRelation() {
    this.registerTool({
      title: "update_bank_relation",
      annotations: UPDATE_TOOL,
      description:
        "Updates a bank relation. The current version must be provided for optimistic locking.",
      inputSchema: z.strictObject({
        id: ApiSchema.BankRelations.GetBankRelationsRequestSchema.shape.id,
        values: ApiSchema.BankRelations.UpdateBankRelationRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.BankRelations.UpdateBankRelationResponseSchema),
      fn: async ({ id, values }) => {
        const result = await DbBankRelations.create(this._args).update({ values, pKey: id });

        return this.mapResult(result, (bankRelation) => ({
          bankRelation: this.#encodeResponse(bankRelation),
        }));
      },
    });
  }

  #registerDeleteBankRelation() {
    this.registerTool({
      title: "delete_bank_relation",
      annotations: DELETE_TOOL,
      description: "Deletes a bank relation.",
      inputSchema: z.strictObject({
        id: ApiSchema.BankRelations.GetBankRelationsRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.BankRelations.GetBankRelationResponseSchema),
      fn: async ({ id }) => {
        const result = await DbBankRelations.create(this._args).delete({ pKey: id });

        return this.mapResult(result, (bankRelation) => ({
          bankRelation: nonNullish(bankRelation)
            ? this.#encodeResponse(bankRelation)
            : bankRelation,
        }));
      },
    });
  }

  #encodeResponse = (bankRelation: SelectBankRelations) => encodeAuditFieldsResponse(bankRelation);
}
