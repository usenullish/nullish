import {
  AccountBalancesReport,
  AccountLedgerReport,
  ActiveAccountsReport,
  BalanceSheetReport,
  IncomeStatementReport,
} from "@usenullish/nullish-engine/ledger";
import { VatDeclarationReport } from "@usenullish/nullish-engine/core";
import {
  ApiSchema,
  CommonSchema,
  encodeAccountLedgerResponse,
} from "@usenullish/nullish-schema/server";
import type { Views } from "@usenullish/nullish-schema/views";
import { BigIntCodec, TimestampCodec, encodeWithCodecs } from "@usenullish/nullish-common";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import { READ_ONLY_TOOL, McpTools, type McpToolsInitArgs } from "./_tools";

export class McpToolsReports extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsReports {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerGetAccountBalances();
    this.#registerGetBalanceSheet();
    this.#registerGetIncomeStatement();
    this.#registerGetAccountLedger();
    this.#registerGetActiveAccounts();
    this.#registerGetVatDeclaration();
  }

  override registerWriteTools() {}

  #registerGetAccountBalances() {
    this.registerTool({
      title: "get_account_balances",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the debit, credit and balance of each account of an organization within an accounting period. Amounts are expressed in the smallest currency unit.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        periodId: ApiSchema.LedgerReports.GetLedgerReportQuerySchema.shape.periodId,
      }),
      outputSchema: toJsonSchema(ApiSchema.AccountBalances.GetAccountBalancesResponseSchema),
      fn: async ({ organizationId, periodId }) => {
        const result = await AccountBalancesReport.create({
          ...this._args,
          organizationId,
        }).list({ periodId });

        return this.mapResult(result, (accountBalances) => ({
          accountBalances: accountBalances.map(this.#encodeResponse),
        }));
      },
    });
  }

  #registerGetAccountLedger() {
    this.registerTool({
      title: "get_account_ledger",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the postings of one account of an organization within an accounting period, each with its journal entry and the balance of the account after it. The balance is always computed in date order over the whole period, whatever the filters, sort and page. Use it to explain how the balance of an account is made up. Amounts are expressed in the smallest currency unit.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        periodId: ApiSchema.AccountLedger.GetAccountLedgerQuerySchema.shape.periodId,
        accountId: ApiSchema.AccountLedger.GetAccountLedgerQuerySchema.shape.accountId,
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.AccountLedger.GetAccountLedgerFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(ApiSchema.AccountLedger.GetAccountLedgerResponseSchema),
      fn: async ({ organizationId, periodId, accountId, query, filters }) => {
        const result = await AccountLedgerReport.create({
          ...this._args,
          organizationId,
        }).list({ periodId, accountId, ...query, filters });

        return this.mapResult(result, encodeAccountLedgerResponse);
      },
    });
  }

  #registerGetActiveAccounts() {
    this.registerTool({
      title: "get_active_accounts",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the ids of the accounts of an organization that have at least one posting within an accounting period, ordered by account code.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        periodId: ApiSchema.LedgerReports.GetLedgerReportQuerySchema.shape.periodId,
      }),
      outputSchema: toJsonSchema(ApiSchema.ActiveAccounts.GetActiveAccountsResponseSchema),
      fn: async ({ organizationId, periodId }) => {
        const result = await ActiveAccountsReport.create({
          ...this._args,
          organizationId,
        }).list({ periodId });

        return this.mapResult(result, (accountIds) => ({ accountIds }));
      },
    });
  }

  #registerGetBalanceSheet() {
    this.registerTool({
      title: "get_balance_sheet",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the balance sheet (assets, liabilities and equity) of an organization for an accounting period. Amounts are expressed in the smallest currency unit.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        periodId: ApiSchema.LedgerReports.GetLedgerReportQuerySchema.shape.periodId,
      }),
      outputSchema: toJsonSchema(ApiSchema.BalanceSheet.GetBalanceSheetResponseSchema),
      fn: async ({ organizationId, periodId }) => {
        const result = await BalanceSheetReport.create({
          ...this._args,
          organizationId,
        }).list({ periodId });

        return this.mapResult(result, (balanceSheet) => ({
          balanceSheet: balanceSheet.map(this.#encodeResponse),
        }));
      },
    });
  }

  #registerGetIncomeStatement() {
    this.registerTool({
      title: "get_income_statement",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the income statement (revenues and expenses) of an organization for an accounting period. Amounts are expressed in the smallest currency unit.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        periodId: ApiSchema.LedgerReports.GetLedgerReportQuerySchema.shape.periodId,
      }),
      outputSchema: toJsonSchema(ApiSchema.IncomeStatement.GetIncomeStatementResponseSchema),
      fn: async ({ organizationId, periodId }) => {
        const result = await IncomeStatementReport.create({
          ...this._args,
          organizationId,
        }).list({ periodId });

        return this.mapResult(result, (incomeStatement) => ({
          incomeStatement: incomeStatement.map(this.#encodeResponse),
        }));
      },
    });
  }

  #registerGetVatDeclaration() {
    this.registerTool({
      title: "get_vat_declaration",
      annotations: READ_ONLY_TOOL,
      description: "Generates the VAT declaration of an organization for a VAT period.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        values: ApiSchema.VatReports.GenerateVatDeclarationRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.VatReports.GenerateVatDeclarationResponseSchema),
      fn: async ({ organizationId, values }) => {
        const result = await VatDeclarationReport.create({
          ...this._args,
          organizationId,
        }).generate(values);

        return this.mapResult(result, (declaration) =>
          encodeWithCodecs({
            schema: ApiSchema.VatReports.GenerateVatDeclarationResponseSchema,
            value: declaration,
          }),
        );
      },
    });
  }

  #encodeResponse = (
    data:
      | Views["Ledger"]["AccountBalances"]["Select"]
      | Views["Ledger"]["BalanceSheet"]["Select"]
      | Views["Ledger"]["IncomeStatement"]["Select"],
  ) => ({
    ...data,
    totalDebit: encodeWithCodecs({ schema: BigIntCodec, value: data.totalDebit }),
    totalCredit: encodeWithCodecs({ schema: BigIntCodec, value: data.totalCredit }),
    balance: encodeWithCodecs({ schema: BigIntCodec, value: data.balance }),
    computedAt: encodeWithCodecs({ schema: TimestampCodec, value: data.computedAt }),
  });
}
