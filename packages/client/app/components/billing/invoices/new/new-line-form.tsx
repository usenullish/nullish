import { useId } from "react";
import { nonNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { InvoiceLineType } from "@usenullish/nullish-schema/db";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { useCurrencyDecimals } from "~/kit/data/currencies.hooks";
import { amountStep } from "~/kit/utils/amount.utils";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const NewLineForm = ({
  currency,
  onAction,
  pending,
}: {
  currency: Api["Invoices"]["Client"]["Invoice"]["currency"];
  onAction: (payload: FormData) => void;
  pending: boolean;
}) => {
  const { i18n } = useI18n();
  const decimalsOf = useCurrencyDecimals();
  const typeId = useId();
  const descriptionId = useId();
  const quantityId = useId();
  const unitPriceId = useId();

  const decimals = decimalsOf(currency);

  const types = Object.values(InvoiceLineType).map((value) => ({
    value,
    label: i18n.lines.type[value],
  }));

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      {nonNullish(decimals) && <input type="hidden" name="decimals" value={decimals} />}

      <FieldGroup>
        <h1 className="text-xs font-medium">{i18n.lines.action.create}</h1>

        <Field>
          <FieldLabel htmlFor={typeId}>{i18n.core.label.type}</FieldLabel>
          <Select items={types} name="type" defaultValue={InvoiceLineType.ITEM} required>
            <SelectTrigger id={typeId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor={descriptionId}>{i18n.core.label.description}</FieldLabel>
          <Input id={descriptionId} name="description" required />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor={quantityId}>{i18n.lines.label.quantity}</FieldLabel>
            <Input id={quantityId} name="quantity" type="number" step="0.001" min="0" required />
          </Field>

          <Field>
            <FieldLabel htmlFor={unitPriceId}>
              {i18n.lines.label.unit_price} ({currency})
            </FieldLabel>
            <Input
              id={unitPriceId}
              name="unitPrice"
              type="number"
              step={amountStep(decimals)}
              min="0"
              required
            />
          </Field>
        </div>

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.lines.state.creating : i18n.lines.action.create}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
