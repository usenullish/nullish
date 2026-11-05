import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { type Result } from "@usenullish/nullish-common";
import * as z from "zod";
import { VatSettingsService } from "~/lib/services/vat+settings.services";

interface SubmitVatSettingEditArgs {
  formData: FormData;
  vatSettingId: Api["VatSettings"]["Client"]["VatSetting"]["id"];
}

export const buildUseVatSettingEditAction = ({
  vatSettingId,
}: Pick<SubmitVatSettingEditArgs, "vatSettingId">): UseActionStateFn => {
  const useVatSettingEditAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitVatSettingEdit({
      formData,
      vatSettingId,
    });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useVatSettingEditAction;
};

const FormVatSettingEditSchema = ApiSchema.VatSettings.UpdateVatSettingRequestSchema.extend({
  version: z.coerce.number(),
});

const submitVatSettingEdit = async ({
  formData,
  vatSettingId,
}: SubmitVatSettingEditArgs): Promise<
  Result<Api["VatSettings"]["Client"]["UpdateVatSettingResponse"]>
> => {
  const values = FormVatSettingEditSchema.parse({
    vatNumber: formData.get(`vatNumber`),
    version: formData.get(`version`),
  });

  return await VatSettingsService.create().update({ vatSettingId, values });
};
