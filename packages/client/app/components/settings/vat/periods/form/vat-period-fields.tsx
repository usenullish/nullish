import { toLocalDateString } from "@usenullish/nullish-common";
import { useId } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { Field, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { useI18n } from "~/kit/i18n/i18n.context";

export const VatPeriodFields = ({
  period,
}: {
  period?: Api["VatPeriods"]["Client"]["VatPeriod"];
}) => {
  const { i18n } = useI18n();
  const startOnId = useId();
  const endOnId = useId();

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor={startOnId}>{i18n.core.label.start_date}</FieldLabel>
          <Input
            id={startOnId}
            name="startOn"
            type="date"
            defaultValue={period === undefined ? undefined : toLocalDateString(period.startOn)}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={endOnId}>{i18n.core.label.end_date}</FieldLabel>
          <Input
            id={endOnId}
            name="endOn"
            type="date"
            defaultValue={period === undefined ? undefined : toLocalDateString(period.endOn)}
            required
          />
        </Field>
      </div>
    </>
  );
};
