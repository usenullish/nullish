import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { OrganizationsService } from "~/lib/services/organizations.services";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";
import { OrganizationsReportsService } from "~/lib/services/organizations+reports.services";

export class OrganizationsServer extends ServerLoader {
  #service = OrganizationsService.create();
  #reportsService = OrganizationsReportsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): OrganizationsServer {
    return new OrganizationsServer({ context: "organizations" });
  }

  async listAllOrganizations(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["Organizations"]["Client"]["GetOrganizationsResponse"]>> {
    return await this._load({
      args,
      errorFallbackMsg: "Unexpected error while loading the organizations",
      loaderFn: this.#service.listAll,
    });
  }

  async listReportsAccountBalances({
    args,
    query,
  }: {
    args: LoaderFunctionArgs;
    query: Api["LedgerReports"]["Client"]["GetLedgerReportQuery"];
  }): Promise<Option<Api["AccountBalances"]["Client"]["GetAccountBalancesResponse"]>> {
    return await this._loadNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the account balances of the organization",
      loaderWithOrgIdFn: (params) => this.#reportsService.listAccountBalances({ ...params, query }),
    });
  }

  async listReportsAccountLedger({
    args,
    query,
  }: {
    args: LoaderFunctionArgs;
    query: Api["AccountLedger"]["Client"]["GetAccountLedgerQuery"];
  }): Promise<Option<Api["AccountLedger"]["Client"]["GetAccountLedgerResponse"]>> {
    return await this._loadListNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the account ledger of the organization",
      defaultSort: { field: "validOn", direction: "desc" },
      filtersSchema: ApiSchema.AccountLedger.GetAccountLedgerFiltersQuerySchema.strip(),
      loaderWithOrgIdFn: (params) =>
        this.#reportsService.listAccountLedger({ ...params, ...query }),
    });
  }

  async listReportsActiveAccounts({
    args,
    query,
  }: {
    args: LoaderFunctionArgs;
    query: Api["LedgerReports"]["Client"]["GetLedgerReportQuery"];
  }): Promise<Option<Api["ActiveAccounts"]["Client"]["GetActiveAccountsResponse"]>> {
    return await this._loadNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the active accounts of the organization",
      loaderWithOrgIdFn: (params) => this.#reportsService.listActiveAccounts({ ...params, query }),
    });
  }

  async listReportsBalanceSheet({
    args,
    query,
  }: {
    args: LoaderFunctionArgs;
    query: Api["LedgerReports"]["Client"]["GetLedgerReportQuery"];
  }): Promise<Option<Api["BalanceSheet"]["Client"]["GetBalanceSheetResponse"]>> {
    return await this._loadNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the balance sheet of the organization",
      loaderWithOrgIdFn: (params) => this.#reportsService.listBalanceSheet({ ...params, query }),
    });
  }

  async listReportsIncomeStatement({
    args,
    query,
  }: {
    args: LoaderFunctionArgs;
    query: Api["LedgerReports"]["Client"]["GetLedgerReportQuery"];
  }): Promise<Option<Api["IncomeStatement"]["Client"]["GetIncomeStatementResponse"]>> {
    return await this._loadNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the income statement of the organization",
      loaderWithOrgIdFn: (params) => this.#reportsService.listIncomeStatement({ ...params, query }),
    });
  }

  async generateReportsVatDeclaration(
    args: LoaderFunctionArgs,
    body: Api["VatReports"]["Client"]["GenerateVatDeclarationRequest"],
  ): Promise<Option<Api["VatReports"]["Client"]["GenerateVatDeclarationResponse"]>> {
    return await this._loadNested({
      args,
      errorFallbackMsg: "Unexpected error while generating the VAT declaration of the organization",
      loaderWithOrgIdFn: (params) =>
        this.#reportsService.generateVatDeclaration({ ...params, body }),
    });
  }
}
