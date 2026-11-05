import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { type Result } from "@usenullish/nullish-common";
import * as z from "zod";
import { VatMethodsService } from "~/lib/services/vat+methods.services";

interface SubmitVatMethodEditArgs {
  formData: FormData;
  vatMethodId: Api["VatMethods"]["Client"]["VatMethod"]["id"];
}

export const buildUseVatMethodEditAction = ({
  vatMethodId,
}: Pick<SubmitVatMethodEditArgs, "vatMethodId">): UseActionStateFn => {
  const useVatMethodEditAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitVatMethodEdit({
      formData,
      vatMethodId,
    });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useVatMethodEditAction;
};

const FormVatMethodEditSchema = ApiSchema.VatMethods.UpdateVatMethodRequestSchema.extend({
  version: z.coerce.number(),
});

const submitVatMethodEdit = async ({
  formData,
  vatMethodId,
}: SubmitVatMethodEditArgs): Promise<
  Result<Api["VatMethods"]["Client"]["UpdateVatMethodResponse"]>
> => {
  const values = FormVatMethodEditSchema.parse({
    remunerationMethod: formData.get(`remunerationMethod`),
    paymentMethod: formData.get(`paymentMethod`),
    version: formData.get(`version`),
  });

  return await VatMethodsService.create().update({ vatMethodId, values });
};
