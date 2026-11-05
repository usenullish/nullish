import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Result } from "@usenullish/nullish-common";
import { VatPeriodsService } from "~/lib/services/vat+periods.services";
import * as z from "zod";

interface SubmitVatPeriodEditArgs {
  formData: FormData;
  vatPeriodId: Api["VatPeriods"]["Client"]["VatPeriod"]["id"];
}

export const buildUseVatPeriodEditAction = ({
  vatPeriodId,
}: Pick<SubmitVatPeriodEditArgs, "vatPeriodId">): UseActionStateFn => {
  const useVatPeriodEditAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitVatPeriodEdit({
      formData,
      vatPeriodId,
    });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useVatPeriodEditAction;
};

const FormVatPeriodEditSchema = ApiSchema.VatPeriods.UpdateVatPeriodRequestSchema.extend({
  version: z.coerce.number(),
  startOn: z.coerce.date(),
  endOn: z.coerce.date(),
});

const submitVatPeriodEdit = async ({
  formData,
  vatPeriodId,
}: SubmitVatPeriodEditArgs): Promise<
  Result<Api["VatPeriods"]["Client"]["UpdateVatPeriodResponse"]>
> => {
  const values = FormVatPeriodEditSchema.parse({
    startOn: formData.get("startOn"),
    endOn: formData.get("endOn"),
    version: formData.get("version"),
  });

  return await VatPeriodsService.create().update({ vatPeriodId, values });
};
