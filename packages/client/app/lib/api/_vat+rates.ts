import type { Api } from "@usenullish/nullish-schema/server";

export interface ApiVatRatesGetByIdArgs {
  id: NonNullable<Api["VatRates"]["Client"]["GetVatRateResponse"]["rate"]>["id"];
}

export interface ApiVatRatesWritableArgs {
  vatRateId: Api["VatRates"]["Client"]["VatRate"]["id"];
}
