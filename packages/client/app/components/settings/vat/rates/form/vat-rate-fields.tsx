import { useId, useState } from "react";
import { type Nullable, toLocalDateString } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { VatType } from "@usenullish/nullish-schema/db";
import { Field, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { useI18n } from "~/kit/i18n/i18n.context";

type VatRate = Api["VatRates"]["Client"]["VatRate"];

export type VatRateDefaults = Pick<VatRate, "code" | "rate" | "startOn">;

export const VatRateFields = ({
  rate,
  defaults,
}: {
  rate?: VatRate;
  defaults?: VatRateDefaults;
}) => {
  const initial = rate ?? defaults;

  const { i18n } = useI18n();
  const codeId = useId();
  const typeId = useId();
  const rateId = useId();
  const netRateId = useId();
  const startOnId = useId();
  const endOnId = useId();

  const [type, setType] = useState(rate?.type ?? VatType.NET_RATE_TAX);

  const types = Object.values(VatType).map((value) => ({
    value,
    label: i18n.vat.type[value],
  }));

  const netRateTax = type === VatType.NET_RATE_TAX;

  return (
    <>
      <Field>
        <FieldLabel htmlFor={codeId}>{i18n.core.label.code}</FieldLabel>
        <Input id={codeId} name="code" defaultValue={initial?.code} required />
      </Field>

      <Field>
        <FieldLabel htmlFor={typeId}>{i18n.core.label.type}</FieldLabel>
        <Select
          items={types}
          name="type"
          value={type}
          onValueChange={(value: Nullable<VatType>) => setType(value ?? VatType.NET_RATE_TAX)}
          required
        >
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

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor={rateId}>{i18n.vat.label.rate_percent}</FieldLabel>
          <Input
            id={rateId}
            name="rate"
            type="number"
            step="0.001"
            defaultValue={initial?.rate}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={netRateId}>{i18n.vat.label.net_rate_percent}</FieldLabel>
          <Input
            id={netRateId}
            name="netRate"
            type="number"
            step="0.001"
            defaultValue={rate?.netRate ?? undefined}
            disabled={!netRateTax}
            required={netRateTax}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor={startOnId}>{i18n.core.label.start_date}</FieldLabel>
          <Input
            id={startOnId}
            name="startOn"
            type="date"
            defaultValue={initial === undefined ? undefined : toLocalDateString(initial.startOn)}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={endOnId}>{i18n.core.label.end_date}</FieldLabel>
          <Input
            id={endOnId}
            name="endOn"
            type="date"
            defaultValue={
              rate?.endOn === undefined || rate.endOn === null
                ? undefined
                : toLocalDateString(rate.endOn)
            }
          />
        </Field>
      </div>
    </>
  );
};
