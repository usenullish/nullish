import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { VatSettingFields } from "~/components/settings/vat/settings/form/vat-setting-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const VatSettingEditForm = ({
  onAction,
  pending,
  setting,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
  setting: Api["VatSettings"]["Client"]["VatSetting"];
}) => {
  const { i18n } = useI18n();

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <input type="hidden" name="version" value={setting.version} />

      <FieldGroup>
        <VatSettingFields setting={setting} />

        <WriteGuard>
          <Field>
            <Button type="submit" disabled={pending}>
              {pending ? i18n.core.state.saving : i18n.core.action.save}
            </Button>
          </Field>
        </WriteGuard>
      </FieldGroup>
    </form>
  );
};
