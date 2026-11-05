import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { PeriodsService } from "~/lib/services/periods.services";

export const buildUseClosePeriodAction = ({
  periodId,
}: {
  periodId: Api["Periods"]["Client"]["Period"]["id"];
}): UseActionStateFn => {
  const useClosePeriodAction: UseActionStateFn = async (_prevState, formData) => {
    const args = ApiSchema.PeriodsClose.ClosePeriodRequestSchema.parse({
      mode: formData.get("mode"),
    });

    const result = await PeriodsService.create().close({ periodId, args });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useClosePeriodAction;
};
