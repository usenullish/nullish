import { Button } from "~/ui/components/button";
import { Field, FieldDescription, FieldGroup } from "~/ui/components/field";
import { VatSettingFields } from "~/components/settings/vat/settings/form/vat-setting-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const NewVatSettingsForm = ({
  onAction,
  pending,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
}) => {
  const { i18n } = useI18n();

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <FieldGroup>
        <FieldDescription>{i18n.vat.text.settings_intro}</FieldDescription>

        <VatSettingFields />

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.vat.state.creating : i18n.vat.action.settings_create}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
