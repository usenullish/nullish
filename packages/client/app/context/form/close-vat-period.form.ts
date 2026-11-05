import type { UseActionStateFn } from "~/context/form/form";
import type { Api } from "@usenullish/nullish-schema/server";
import { VatPeriodStatus } from "@usenullish/nullish-schema/db";
import { VatPeriodsService } from "~/lib/services/vat+periods.services";

export const buildUseCloseVatPeriodAction = ({
  period: { id: vatPeriodId, version },
}: {
  period: Api["VatPeriods"]["Client"]["VatPeriod"];
}): UseActionStateFn => {
  const useCloseVatPeriodAction: UseActionStateFn = async () => {
    const result = await VatPeriodsService.create().update({
      vatPeriodId,
      values: { status: VatPeriodStatus.CLOSED, version },
    });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useCloseVatPeriodAction;
};
