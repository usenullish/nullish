import { PeriodsService } from "~/lib/services/periods.services";
import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { PeriodStatus } from "@usenullish/nullish-schema/db";
import { type Result } from "@usenullish/nullish-common";
import * as z from "zod";

interface SubmitPeriodArgs {
  formData: FormData;
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}

export const buildUseNewPeriodAction = ({
  organizationId,
}: Pick<SubmitPeriodArgs, "organizationId">): UseActionStateFn => {
  const useNewPeriodAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitPeriod({ formData, organizationId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useNewPeriodAction;
};

const FormCreatePeriodSchema = ApiSchema.Periods.CreatePeriodRequestSchema.extend({
  startOn: z.coerce.date(),
  endOn: z.coerce.date(),
});

const submitPeriod = async ({
  formData,
  organizationId,
}: SubmitPeriodArgs): Promise<Result<Api["Periods"]["Client"]["CreatePeriodResponse"]>> => {
  const period = FormCreatePeriodSchema.parse({
    startOn: formData.get("startOn"),
    endOn: formData.get("endOn"),
    status: PeriodStatus.OPEN,
  });

  return await PeriodsService.create().submit({ organizationId, period });
};
