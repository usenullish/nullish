import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { type Result, emptyStringToNull } from "@usenullish/nullish-common";
import { VatRatesService } from "~/lib/services/vat+rates.services";
import * as z from "zod";

interface SubmitVatRateArgs {
  formData: FormData;
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}

export const buildUseNewVatRateAction = ({
  organizationId,
}: Pick<SubmitVatRateArgs, "organizationId">): UseActionStateFn => {
  const useNewVatRateAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitVatRate({ formData, organizationId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useNewVatRateAction;
};

const FormCreateVatRateSchema = ApiSchema.VatRates.CreateVatRateRequestSchema.extend({
  startOn: z.coerce.date(),
  endOn: emptyStringToNull(z.coerce.date().nullable()),
  rate: z.coerce.number(),
  netRate: emptyStringToNull(z.coerce.number().nullable()),
});

const submitVatRate = async ({
  formData,
  organizationId,
}: SubmitVatRateArgs): Promise<Result<Api["VatRates"]["Client"]["CreateVatRateResponse"]>> => {
  const rate = FormCreateVatRateSchema.parse({
    code: formData.get("code"),
    type: formData.get("type"),
    rate: formData.get("rate"),
    netRate: formData.get("netRate"),
    startOn: formData.get("startOn"),
    endOn: formData.get("endOn"),
  });

  return await VatRatesService.create().submit({ organizationId, rate });
};
