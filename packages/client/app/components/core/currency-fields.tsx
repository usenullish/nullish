import { useId, useState } from "react";
import { nonNullish, type Option } from "@usenullish/nullish-common";
import { Field, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { CurrencyCombobox } from "~/components/core/currency-combobox";
import { useCurrencyDecimals } from "~/kit/data/currencies.hooks";
import { useAccountingSettings } from "~/context/contexts/accounting-settings.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import { EXCHANGE_RATE_DECIMALS } from "@usenullish/nullish-schema/db";
import { NO_SPIN_BUTTON_CLASS } from "~/kit/utils/input.utils";

export const CurrencyFields = ({
  defaultCurrency,
  onDecimalsChange,
}: {
  defaultCurrency?: string;
  onDecimalsChange?: (decimals: Option<number>) => void;
}) => {
  const { i18n } = useI18n();
  const decimalsOf = useCurrencyDecimals();
  const accountingSettings = useAccountingSettings();
  const currencyId = useId();
  const exchangeRateId = useId();

  const baseCurrency = accountingSettings?.baseCurrency;

  const [currency, setCurrency] = useState(defaultCurrency ?? baseCurrency);
  const [exchangeRate, setExchangeRate] = useState("1");

  const decimals = decimalsOf(currency);

  const base = currency === baseCurrency;

  return (
    <div className="grid grid-cols-2 gap-4">
      {nonNullish(decimals) && <input type="hidden" name="decimals" value={decimals} />}

      <Field>
        <FieldLabel htmlFor={currencyId}>{i18n.core.label.currency}</FieldLabel>
        <CurrencyCombobox
          id={currencyId}
          name="currency"
          value={currency}
          onValueChange={(value) => {
            const next = value ?? baseCurrency;
            setCurrency(next);
            setExchangeRate("1");
            onDecimalsChange?.(decimalsOf(next));
          }}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={exchangeRateId}>{i18n.core.label.exchange_rate}</FieldLabel>
        {base && <input type="hidden" name="exchangeRate" value="1" />}
        <Input
          id={exchangeRateId}
          name={base ? undefined : "exchangeRate"}
          type="number"
          step={10 ** -EXCHANGE_RATE_DECIMALS}
          min="0"
          className={NO_SPIN_BUTTON_CLASS}
          value={base ? "1" : exchangeRate}
          disabled={base}
          onChange={($event) => setExchangeRate($event.target.value)}
          required
        />
      </Field>
    </div>
  );
};
