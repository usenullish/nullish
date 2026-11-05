import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Result } from "@usenullish/nullish-common";
import { PeriodsService } from "~/lib/services/periods.services";
import * as z from "zod";

interface SubmitPeriodEditArgs {
  formData: FormData;
  periodId: Api["Periods"]["Client"]["Period"]["id"];
}

export const buildUsePeriodEditAction = ({
  periodId,
}: Pick<SubmitPeriodEditArgs, "periodId">): UseActionStateFn => {
  const usePeriodEditAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitPeriodEdit({ formData, periodId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return usePeriodEditAction;
};

const FormPeriodEditSchema = ApiSchema.Periods.UpdatePeriodRequestSchema.extend({
  version: z.coerce.number(),
  startOn: z.coerce.date(),
  endOn: z.coerce.date(),
});

const submitPeriodEdit = async ({
  formData,
  periodId,
}: SubmitPeriodEditArgs): Promise<Result<Api["Periods"]["Client"]["UpdatePeriodResponse"]>> => {
  const values = FormPeriodEditSchema.parse({
    startOn: formData.get("startOn"),
    endOn: formData.get("endOn"),
    version: formData.get("version"),
  });

  return await PeriodsService.create().update({ periodId, values });
};
