import { useId } from "react";
import { nonNullish, type Nullable } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { VatPaymentMethod, VatRemunerationMethod } from "@usenullish/nullish-schema/db";
import { Field, FieldLabel } from "~/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { useI18n } from "~/kit/i18n/i18n.context";

type VatMethod = Api["VatMethods"]["Client"]["VatMethod"];

export const VatMethodSelects = ({
  method,
  onPaymentMethodChange,
}: {
  method?: Pick<VatMethod, "remunerationMethod" | "paymentMethod">;
  onPaymentMethodChange?: (paymentMethod: VatPaymentMethod) => void;
}) => {
  const { i18n } = useI18n();
  const paymentMethodId = useId();
  const remunerationMethodId = useId();

  const paymentMethods = Object.values(VatPaymentMethod).map((value) => ({
    value,
    label: i18n.vat.payment_method[value],
  }));

  const remunerationMethods = Object.values(VatRemunerationMethod).map((value) => ({
    value,
    label: i18n.vat.remuneration_method[value],
  }));

  return (
    <>
      <Field>
        <FieldLabel htmlFor={paymentMethodId}>{i18n.vat.label.payment_method}</FieldLabel>
        <Select
          items={paymentMethods}
          name="paymentMethod"
          defaultValue={method?.paymentMethod ?? null}
          onValueChange={(value: Nullable<VatPaymentMethod>) => {
            if (nonNullish(value)) {
              onPaymentMethodChange?.(value);
            }
          }}
          required
        >
          <SelectTrigger id={paymentMethodId} className="w-full">
            <SelectValue placeholder={i18n.vat.label.select_payment_method} />
          </SelectTrigger>
          <SelectContent>
            {paymentMethods.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor={remunerationMethodId}>{i18n.vat.label.remuneration_method}</FieldLabel>
        <Select
          items={remunerationMethods}
          name="remunerationMethod"
          defaultValue={method?.remunerationMethod ?? null}
          required
        >
          <SelectTrigger id={remunerationMethodId} className="w-full">
            <SelectValue placeholder={i18n.vat.label.select_remuneration_method} />
          </SelectTrigger>
          <SelectContent>
            {remunerationMethods.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </>
  );
};
