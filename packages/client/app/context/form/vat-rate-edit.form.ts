import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { type Result, emptyStringToNull } from "@usenullish/nullish-common";
import { VatRatesService } from "~/lib/services/vat+rates.services";
import * as z from "zod";

interface SubmitVatRateEditArgs {
  formData: FormData;
  vatRateId: Api["VatRates"]["Client"]["VatRate"]["id"];
}

export const buildUseVatRateEditAction = ({
  vatRateId,
}: Pick<SubmitVatRateEditArgs, "vatRateId">): UseActionStateFn => {
  const useVatRateEditAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitVatRateEdit({
      formData,
      vatRateId,
    });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useVatRateEditAction;
};

const FormVatRateEditSchema = ApiSchema.VatRates.UpdateVatRateRequestSchema.extend({
  version: z.coerce.number(),
  rate: z.coerce.number(),
  netRate: emptyStringToNull(z.coerce.number().nullable()),
  startOn: z.coerce.date(),
  endOn: emptyStringToNull(z.coerce.date().nullable()),
});

const submitVatRateEdit = async ({
  formData,
  vatRateId,
}: SubmitVatRateEditArgs): Promise<Result<Api["VatRates"]["Client"]["UpdateVatRateResponse"]>> => {
  const values = FormVatRateEditSchema.parse({
    code: formData.get("code"),
    type: formData.get("type"),
    rate: formData.get("rate"),
    netRate: formData.get("netRate"),
    startOn: formData.get("startOn"),
    endOn: formData.get("endOn"),
    version: formData.get("version"),
  });

  return await VatRatesService.create().update({ vatRateId, values });
};
