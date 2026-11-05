import { useId } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { nonNullish } from "@usenullish/nullish-common";
import { Field, FieldLabel } from "~/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { VatMethodSelects } from "~/components/settings/vat/methods/form/vat-method-selects";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useFormatDate } from "~/kit/format/date.hooks";

export const VatMethodFields = ({
  method,
  periods,
}: {
  method?: Api["VatMethods"]["Client"]["VatMethod"];
  periods: Api["Periods"]["Client"]["Period"][];
}) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();
  const periodId = useId();

  const periodItems = periods.map(({ id, startOn, endOn }) => ({
    value: id,
    label: `${formatDate(startOn)} – ${formatDate(endOn)}`,
  }));

  return (
    <>
      <Field>
        <FieldLabel htmlFor={periodId}>{i18n.periods.label.period}</FieldLabel>
        <Select
          items={periodItems}
          name="periodId"
          defaultValue={method?.periodId ?? periodItems[0]?.value}
          disabled={nonNullish(method)}
          required
        >
          <SelectTrigger id={periodId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodItems.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <VatMethodSelects method={method} />
    </>
  );
};
