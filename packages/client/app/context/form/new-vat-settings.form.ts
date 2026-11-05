import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Result } from "@usenullish/nullish-common";
import { VatSettingsService } from "~/lib/services/vat+settings.services";

interface SubmitVatSettingsArgs {
  formData: FormData;
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}

export const buildUseNewVatSettingsAction = ({
  organizationId,
}: Pick<SubmitVatSettingsArgs, "organizationId">): UseActionStateFn => {
  const useNewVatSettingsAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitVatSettings({ formData, organizationId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useNewVatSettingsAction;
};

export const submitVatSettings = async ({
  formData,
  organizationId,
}: SubmitVatSettingsArgs): Promise<
  Result<Api["VatSettings"]["Client"]["CreateVatSettingResponse"]>
> => {
  const setting = ApiSchema.VatSettings.CreateVatSettingRequestSchema.parse({
    vatNumber: formData.get("vatNumber"),
  });

  return await VatSettingsService.create().submit({ organizationId, setting });
};
