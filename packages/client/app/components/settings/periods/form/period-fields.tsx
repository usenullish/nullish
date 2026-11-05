import { useId } from "react";
import { Field, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { useI18n } from "~/kit/i18n/i18n.context";

export const PeriodFields = ({
  defaultStartOn,
  defaultEndOn,
}: {
  defaultStartOn: string;
  defaultEndOn: string;
}) => {
  const { i18n } = useI18n();
  const startOnInputId = useId();
  const endOnInputId = useId();

  return (
    <div className="grid grid-cols-2 gap-4">
      <Field>
        <FieldLabel htmlFor={startOnInputId}>{i18n.core.label.start_date}</FieldLabel>
        <Input
          id={startOnInputId}
          name="startOn"
          type="date"
          defaultValue={defaultStartOn}
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={endOnInputId}>{i18n.core.label.end_date}</FieldLabel>
        <Input id={endOnInputId} name="endOn" type="date" defaultValue={defaultEndOn} required />
      </Field>
    </div>
  );
};
