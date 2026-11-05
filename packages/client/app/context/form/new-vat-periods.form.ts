import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Result } from "@usenullish/nullish-common";
import { VatPeriodsService } from "~/lib/services/vat+periods.services";
import * as z from "zod";

interface SubmitVatPeriodArgs {
  formData: FormData;
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}

export const buildUseNewVatPeriodAction = ({
  organizationId,
}: Pick<SubmitVatPeriodArgs, "organizationId">): UseActionStateFn => {
  const useNewVatPeriodAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitVatPeriod({ formData, organizationId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useNewVatPeriodAction;
};

const FormCreateVatPeriodSchema = ApiSchema.VatPeriods.CreateVatPeriodRequestSchema.extend({
  startOn: z.coerce.date(),
  endOn: z.coerce.date(),
});

const submitVatPeriod = async ({
  formData,
  organizationId,
}: SubmitVatPeriodArgs): Promise<
  Result<Api["VatPeriods"]["Client"]["CreateVatPeriodResponse"]>
> => {
  const period = FormCreateVatPeriodSchema.parse({
    startOn: formData.get("startOn"),
    endOn: formData.get("endOn"),
  });

  return await VatPeriodsService.create().submit({ organizationId, period });
};
