import type { Nullable } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { useFormatVatRate } from "~/kit/format/vat-rates.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";

type VatRate = Api["VatRates"]["Client"]["VatRate"];
type VatRateId = Nullable<VatRate["id"]>;

export const VatRateSelect = ({
  id,
  name,
  vatRates,
  value,
  defaultValue,
  onValueChange,
}: {
  id: string;
  name: string;
  vatRates: VatRate[];
  value?: VatRateId;
  defaultValue?: VatRateId;
  onValueChange?: (value: VatRateId) => void;
}) => {
  const { i18n } = useI18n();
  const vatRateLabel = useFormatVatRate();

  const rateItems = [
    { value: null, label: i18n.vat.label.no_vat_rate },
    ...vatRates.map((rate) => ({ value: rate.id, label: vatRateLabel(rate) })),
  ];

  return (
    <Select
      items={rateItems}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {rateItems.map(({ value, label }) => (
          <SelectItem key={value ?? ""} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
