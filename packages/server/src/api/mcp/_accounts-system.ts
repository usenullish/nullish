import { DbCollectionSystemAccounts, DbSystemAccounts } from "@usenullish/nullish-engine/ledger";
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
import { WRITE_TOOL, READ_ONLY_TOOL, McpTools, type McpToolsInitArgs, UPDATE_TOOL } from "./_tools";

type SelectSystemAccounts = Records["Ledger"]["SystemAccounts"]["Select"];
type FilterSystemAccounts = Records["Ledger"]["SystemAccounts"]["Filter"];

export class McpToolsSystemAccounts extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsSystemAccounts {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListSystemAccounts();
    this.#registerGetSystemAccount();
  }

  override registerWriteTools() {
    this.#registerCreateSystemAccount();
    this.#registerUpdateSystemAccount();
  }

  #registerListSystemAccounts() {
    this.registerTool({
      title: "list_system_accounts",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the system accounts (account mappings used for automatic postings) of an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.SystemAccounts.GetSystemAccountsFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(ApiSchema.SystemAccounts.GetSystemAccountsResponseSchema),
      fn: async ({ organizationId, query, filters }) => {
        const store: DbCollectionStore<
          SelectSystemAccounts,
          unknown,
          string,
          FilterSystemAccounts
        > = DbCollectionSystemAccounts.create({
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

  #registerGetSystemAccount() {
    this.registerTool({
      title: "get_system_account",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns a system account (account mapping used for automatic postings) by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.SystemAccounts.GetSystemAccountsRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.SystemAccounts.GetSystemAccountResponseSchema),
      fn: async ({ id }) => {
        const result = await DbSystemAccounts.create(this._args).find({ pKey: id });

        return this.mapResult(result, (account) => ({
          account: nonNullish(account) ? this.#encodeResponse(account) : account,
        }));
      },
    });
  }

  #registerCreateSystemAccount() {
    this.registerTool({
      title: "create_system_account",
      annotations: WRITE_TOOL,
      description:
        "Creates a system account (account mapping used for automatic postings) for an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        values: ApiSchema.SystemAccounts.CreateSystemAccountRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.SystemAccounts.CreateSystemAccountResponseSchema),
      fn: async ({ organizationId, values }) => {
        const result = await DbCollectionSystemAccounts.create({
          ...this._args,
          foreignKeyId: organizationId,
        }).insert({ values });

        return this.mapResult(result, (account) => ({
          account: this.#encodeResponse(account),
        }));
      },
    });
  }

  #registerUpdateSystemAccount() {
    this.registerTool({
      title: "update_system_account",
      annotations: UPDATE_TOOL,
      description:
        "Updates a system account (account mapping used for automatic postings). The current version must be provided for optimistic locking.",
      inputSchema: z.strictObject({
        id: ApiSchema.SystemAccounts.GetSystemAccountsRequestSchema.shape.id,
        values: ApiSchema.SystemAccounts.UpdateSystemAccountRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.SystemAccounts.UpdateSystemAccountResponseSchema),
      fn: async ({ id, values }) => {
        const result = await DbSystemAccounts.create(this._args).update({ values, pKey: id });

        return this.mapResult(result, (account) => ({
          account: this.#encodeResponse(account),
        }));
      },
    });
  }

  #encodeResponse = (account: SelectSystemAccounts) => encodeAuditFieldsResponse(account);
}
