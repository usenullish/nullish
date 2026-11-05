import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Result } from "@usenullish/nullish-common";
import { VatMethodsService } from "~/lib/services/vat+methods.services";

interface SubmitVatMethodsArgs {
  formData: FormData;
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}

export const buildUseNewVatMethodsAction = ({
  organizationId,
}: Pick<SubmitVatMethodsArgs, "organizationId">): UseActionStateFn => {
  const useNewVatMethodsAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitVatMethods({ formData, organizationId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useNewVatMethodsAction;
};

export const submitVatMethods = async ({
  formData,
  organizationId,
}: SubmitVatMethodsArgs): Promise<
  Result<Api["VatMethods"]["Client"]["CreateVatMethodResponse"]>
> => {
  const method = ApiSchema.VatMethods.CreateVatMethodRequestSchema.parse({
    periodId: formData.get("periodId"),
    remunerationMethod: formData.get("remunerationMethod"),
    paymentMethod: formData.get("paymentMethod"),
  });

  return await VatMethodsService.create().submit({ organizationId, method });
};
