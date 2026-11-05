import { type LoaderFunctionArgs } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { isNullish, type Option, toLocalDateString } from "@usenullish/nullish-common";
import { PeriodsServer } from "~/context/server/periods.server";
import { PERIOD_ID_KEY, type PeriodKey } from "~/context/constants/periods.constants";

// An accounting or a VAT period
type Period = Pick<Api["Periods"]["Client"]["Period"], "id" | "startOn" | "endOn">;

export const loadReportPeriodsData = async (args: LoaderFunctionArgs) => {
  const periods = (await PeriodsServer.create().listAllPeriods(args))?.periods ?? [];

  const period = findReportPeriod({ periods, request: args.request });

  return { periods, period };
};

// The period requested in the URL, otherwise the one covering today, otherwise the latest
export const findReportPeriod = <T extends Period>({
  periods,
  request,
  key = PERIOD_ID_KEY,
}: {
  periods: T[];
  request: Request;
  key?: PeriodKey;
}): Option<T> => {
  const periodId = new URL(request.url).searchParams.get(key);

  const requested = periods.find(({ id }) => id === periodId);

  if (!isNullish(requested)) {
    return requested;
  }

  const today = new Date(toLocalDateString(new Date()));

  const current = periods.find(({ startOn, endOn }) => startOn <= today && today <= endOn);

  return current ?? periods.toSorted((a, b) => b.startOn.getTime() - a.startOn.getTime()).at(0);
};
