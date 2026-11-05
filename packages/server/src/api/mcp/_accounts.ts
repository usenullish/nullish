import { DbCollectionAccounts, DbAccounts } from "@usenullish/nullish-engine/ledger";
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

type SelectAccounts = Records["Ledger"]["Accounts"]["Select"];
type FilterAccounts = Records["Ledger"]["Accounts"]["Filter"];

export class McpToolsAccounts extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsAccounts {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListAccounts();
    this.#registerGetAccount();
  }

  override registerWriteTools() {
    this.#registerCreateAccount();
    this.#registerUpdateAccount();
    this.#registerDeleteAccount();
  }

  #registerListAccounts() {
    this.registerTool({
      title: "list_accounts",
      annotations: READ_ONLY_TOOL,
      description: "Returns the accounts of the chart of accounts of an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.Accounts.GetAccountsFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(ApiSchema.Accounts.GetAccountsResponseSchema),
      fn: async ({ organizationId, query, filters }) => {
        const store: DbCollectionStore<SelectAccounts, unknown, string, FilterAccounts> =
          DbCollectionAccounts.create({
            ...this._args,
            foreignKeyId: organizationId,
          });

        const result = await store.list({ ...query, filters });

        return this.mapResult(result, (accounts) => ({
          accounts: accounts.map(this.#encodeResponse),
        }));
      },
    });
  }

  #registerGetAccount() {
    this.registerTool({
      title: "get_account",
      annotations: READ_ONLY_TOOL,
      description: "Returns an account of the chart of accounts by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.Accounts.GetAccountsRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.Accounts.GetAccountResponseSchema),
      fn: async ({ id }) => {
        const result = await DbAccounts.create(this._args).find({ pKey: id });

        return this.mapResult(result, (account) => ({
          account: nonNullish(account) ? this.#encodeResponse(account) : account,
        }));
      },
    });
  }

  #registerCreateAccount() {
    this.registerTool({
      title: "create_account",
      annotations: WRITE_TOOL,
      description: "Creates an account of the chart of accounts for an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        values: ApiSchema.Accounts.CreateAccountRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.Accounts.CreateAccountResponseSchema),
      fn: async ({ organizationId, values }) => {
        const result = await DbCollectionAccounts.create({
          ...this._args,
          foreignKeyId: organizationId,
        }).insert({ values });

        return this.mapResult(result, (account) => ({
          account: this.#encodeResponse(account),
        }));
      },
    });
  }

  #registerUpdateAccount() {
    this.registerTool({
      title: "update_account",
      annotations: UPDATE_TOOL,
      description:
        "Updates an account of the chart of accounts. The current version must be provided for optimistic locking.",
      inputSchema: z.strictObject({
        id: ApiSchema.Accounts.GetAccountsRequestSchema.shape.id,
        values: ApiSchema.Accounts.UpdateAccountRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.Accounts.UpdateAccountResponseSchema),
      fn: async ({ id, values }) => {
        const result = await DbAccounts.create(this._args).update({ values, pKey: id });

        return this.mapResult(result, (account) => ({
          account: this.#encodeResponse(account),
        }));
      },
    });
  }

  #registerDeleteAccount() {
    this.registerTool({
      title: "delete_account",
      annotations: DELETE_TOOL,
      description:
        "Deletes an account of the chart of accounts. An account with postings, sub-accounts or assigned to a system account cannot be deleted.",
      inputSchema: z.strictObject({
        id: ApiSchema.Accounts.GetAccountsRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.Accounts.GetAccountResponseSchema),
      fn: async ({ id }) => {
        const result = await DbAccounts.create(this._args).delete({ pKey: id });

        return this.mapResult(result, (account) => ({
          account: nonNullish(account) ? this.#encodeResponse(account) : account,
        }));
      },
    });
  }

  #encodeResponse = (account: SelectAccounts) => encodeAuditFieldsResponse(account);
}
