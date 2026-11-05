import type { UseActionStateFn } from "~/context/form/form";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import * as z from "zod";
import { BillingSettingsService } from "~/lib/services/billing+settings.services";
import type { ApiBillingSettingsWritableArgs } from "~/lib/api/_billing+settings";
import { emptyStringToNull } from "@usenullish/nullish-common";

const FormBillingSettingsEditSchema =
  ApiSchema.BillingSettings.UpdateBillingSettingRequestSchema.extend({
    version: z.coerce.number(),
    paymentTermDays: z.coerce.number(),
    vatRateId: emptyStringToNull(z.uuid().nullable()),
    bankRelationId: emptyStringToNull(
      ApiSchema.BankRelations.BankRelationsResponseSchema.shape.id.nullable(),
    ),
  });

export const buildUseBillingSettingsEditAction = ({
  billingSettingId,
}: ApiBillingSettingsWritableArgs): UseActionStateFn => {
  const useBillingSettingsEditAction: UseActionStateFn = async (_prevState, formData) => {
    const values = FormBillingSettingsEditSchema.parse({
      paymentTermDays: formData.get("paymentTermDays"),
      vatRateId: formData.get("vatRateId"),
      bankRelationId: formData.get("bankRelationId"),
      version: formData.get("version"),
    });

    const result = await BillingSettingsService.create().update({ billingSettingId, values });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useBillingSettingsEditAction;
};
