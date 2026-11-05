import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { VatPeriodFields } from "~/components/settings/vat/periods/form/vat-period-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const NewVatPeriodForm = ({
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
        <h1 className="text-xs font-medium">{i18n.vat.action.period_create}</h1>

        <VatPeriodFields />

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.vat.state.creating : i18n.vat.action.period_create}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
