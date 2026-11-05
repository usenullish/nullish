import type { UseActionStateFn } from "~/context/form/form";
import type { Api } from "@usenullish/nullish-schema/server";
import { submitVatSettings } from "~/context/form/new-vat-settings.form";
import { submitVatMethods } from "~/context/form/new-vat-methods.form";

export const buildUseSetupVatAction = ({
  organizationId,
  withSettings,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  withSettings: boolean;
}): UseActionStateFn => {
  const useSetupVatAction: UseActionStateFn = async (_prevState, formData) => {
    if (withSettings) {
      const settings = await submitVatSettings({ formData, organizationId });

      if (settings.status === "error") {
        return { name: "error" as const, err: settings.err };
      }
    }

    const methods = await submitVatMethods({ formData, organizationId });

    if (methods.status === "error") {
      return { name: "error" as const, err: methods.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useSetupVatAction;
};
