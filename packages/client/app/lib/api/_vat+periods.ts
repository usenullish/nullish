import type { Api } from "@usenullish/nullish-schema/server";

export interface ApiVatPeriodsGetByIdArgs {
  id: NonNullable<Api["VatPeriods"]["Client"]["GetVatPeriodResponse"]["period"]>["id"];
}

export interface ApiVatPeriodsWritableArgs {
  vatPeriodId: Api["VatPeriods"]["Client"]["VatPeriod"]["id"];
}
