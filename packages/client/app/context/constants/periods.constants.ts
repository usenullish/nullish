import type { Api } from "@usenullish/nullish-schema/server";

export type PeriodKey =
  | keyof Api["LedgerReports"]["Client"]["GetLedgerReportQuery"]
  | keyof Api["VatReports"]["Client"]["GenerateVatDeclarationRequest"];

export const PERIOD_ID_KEY: PeriodKey = "periodId";

export const VAT_PERIOD_ID_KEY: PeriodKey = "vatPeriodId";
