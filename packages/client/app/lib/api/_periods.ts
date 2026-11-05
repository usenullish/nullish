import type { Api } from "@usenullish/nullish-schema/server";

export interface ApiPeriodsGetByIdArgs {
  id: NonNullable<Api["Periods"]["Client"]["GetPeriodResponse"]["period"]>["id"];
}
