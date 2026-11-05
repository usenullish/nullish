import { Button } from "~/ui/components/button";
import { Field, FieldDescription, FieldGroup } from "~/ui/components/field";
import { PeriodFields } from "~/components/settings/periods/form/period-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const NewPeriodForm = ({
  onAction,
  pending,
  defaultStartOn,
  defaultEndOn,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
  defaultStartOn: string;
  defaultEndOn: string;
}) => {
  const { i18n } = useI18n();

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <FieldGroup>
        <FieldDescription>{i18n.periods.text.intro}</FieldDescription>

        <PeriodFields defaultStartOn={defaultStartOn} defaultEndOn={defaultEndOn} />

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.periods.state.creating : i18n.periods.action.create}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
