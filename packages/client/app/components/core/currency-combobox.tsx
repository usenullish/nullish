import type { Nullable, Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "~/ui/components/combobox";
import { type CurrencyUi, useCurrenciesUi } from "~/kit/data/currencies.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";

type Currency = Api["Currencies"]["Client"]["Currency"];

export const CurrencyCombobox = ({
  id,
  name,
  value,
  onValueChange,
}: {
  id?: string;
  name: string;
  value: Option<Currency["code"]>;
  onValueChange: (code: Nullable<Currency["code"]>) => void;
}) => {
  const { i18n } = useI18n();
  const { currencies, matches } = useCurrenciesUi();

  const selected = currencies.find(({ currency }) => currency.code === value) ?? null;

  return (
    <Combobox
      items={currencies}
      filter={(currencyUi: CurrencyUi, query: string) => matches({ currencyUi, query })}
      name={name}
      value={selected}
      onValueChange={(currencyUi: Nullable<CurrencyUi>) =>
        onValueChange(currencyUi?.currency.code ?? null)
      }
      itemToStringLabel={({ currency }: CurrencyUi) => currency.code}
      itemToStringValue={({ currency }: CurrencyUi) => currency.code}
      isItemEqualToValue={(item: CurrencyUi, value: CurrencyUi) =>
        item.currency.code === value.currency.code
      }
    >
      <ComboboxInput
        id={id}
        placeholder={i18n.core.label.currency}
        aria-label={i18n.core.label.currency}
        required
      />

      <ComboboxContent className="min-w-64">
        <ComboboxEmpty>{i18n.core.text.no_currency}</ComboboxEmpty>
        <ComboboxList>
          {(currencyUi: CurrencyUi) => (
            <ComboboxItem key={currencyUi.currency.code} value={currencyUi}>
              {currencyUi.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};
