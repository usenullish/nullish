import type { Cookie } from "~/lib/schemas/cookie";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiListArgs } from "~/lib/api/_api";
import { ApiOrganizationsReportsSsr } from "~/lib/api/organizations+reports.ssr.api";
import { Service } from "./_services";

export class OrganizationsReportsService extends Service {
  private constructor() {
    super();
  }

  static create(): OrganizationsReportsService {
    return new this();
  }

  listAccountBalances = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
    query: Api["LedgerReports"]["Client"]["GetLedgerReportQuery"];
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["AccountBalances"]["Client"]["GetAccountBalancesResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiOrganizationsReportsSsr.create({
        cookie,
      }).listAccountBalances(rest);
    });
  };

  listAccountLedger = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    Api["AccountLedger"]["Client"]["GetAccountLedgerQuery"] &
    ApiListArgs<Api["AccountLedger"]["Client"]["GetAccountLedgerFilters"]>): Promise<
    Result<Api["AccountLedger"]["Client"]["GetAccountLedgerResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiOrganizationsReportsSsr.create({
        cookie,
      }).listAccountLedger(rest);
    });
  };

  listActiveAccounts = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
    query: Api["LedgerReports"]["Client"]["GetLedgerReportQuery"];
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["ActiveAccounts"]["Client"]["GetActiveAccountsResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiOrganizationsReportsSsr.create({
        cookie,
      }).listActiveAccounts(rest);
    });
  };

  listBalanceSheet = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
    query: Api["LedgerReports"]["Client"]["GetLedgerReportQuery"];
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["BalanceSheet"]["Client"]["GetBalanceSheetResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiOrganizationsReportsSsr.create({
        cookie,
      }).listBalanceSheet(rest);
    });
  };

  listIncomeStatement = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
    query: Api["LedgerReports"]["Client"]["GetLedgerReportQuery"];
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["IncomeStatement"]["Client"]["GetIncomeStatementResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiOrganizationsReportsSsr.create({
        cookie,
      }).listIncomeStatement(rest);
    });
  };

  generateVatDeclaration = async ({
    cookie,
    orgId,
    body,
  }: {
    cookie: Cookie;
    body: Api["VatReports"]["Client"]["GenerateVatDeclarationRequest"];
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["VatReports"]["Client"]["GenerateVatDeclarationResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiOrganizationsReportsSsr.create({
        cookie,
      }).generateVatDeclaration({ orgId, body });
    });
  };
}
