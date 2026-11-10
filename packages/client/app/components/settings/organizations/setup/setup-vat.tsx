import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { isNullish, type Option } from "@usenullish/nullish-common";
import { Navigate } from "react-router";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseSetupVatAction } from "~/context/form/setup-vat.form";
import { VatSettingFields } from "~/components/settings/vat/settings/form/vat-setting-fields";
import { VatMethodSelects } from "~/components/settings/vat/methods/form/vat-method-selects";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { buildFormSubmit } from "~/kit/utils/form.utils";
import { testId } from "~/kit/tests/test.utils";
import { testIds } from "~/kit/tests/test-ids.constants";

export const SetupVat = ({
  organizationId,
  period,
  vatSetting,
  redirectTo,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  period: Api["Periods"]["Client"]["Period"];
  vatSetting: Option<Api["VatSettings"]["Client"]["VatSetting"]>;
  redirectTo: string;
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();

  const withSettings = isNullish(vatSetting);

  const setupAction = buildUseSetupVatAction({ organizationId, withSettings });

  const setupWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await setupAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.vat.toast.settings_create_success });
      }

      return state;
    },
    errorMsg: i18n.vat.toast.settings_create_error,
  });

  const [state, onAction, pending] = useActionState<FormState, FormData>(
    setupWithToastAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return <Navigate to={redirectTo} />;
  }

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <input type="hidden" name="periodId" value={period.id} />

      <FieldGroup>
        {withSettings && <VatSettingFields />}

        <VatMethodSelects />

        <Field>
          <Button type="submit" disabled={pending} {...testId(testIds.setup.vat)}>
            {pending ? i18n.vat.state.creating : i18n.vat.action.settings_create}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
