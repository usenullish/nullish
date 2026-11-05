import { useMemo, useState } from "react";
import type { Nullable } from "@usenullish/nullish-common";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "~/ui/components/combobox";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useFormatCountry } from "~/kit/format/country.hooks";
import { COUNTRY_CODES, PINNED_COUNTRY_CODES } from "~/kit/i18n/countries";

interface Country {
  code: string;
  name: string;
}

export const CountryCombobox = ({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue: Nullable<string>;
}) => {
  const { i18n } = useI18n();
  const formatCountry = useFormatCountry();

  const countries = useMemo(() => {
    const toCountry = (code: string): Country => ({ code, name: formatCountry(code) });

    const pinned: readonly string[] = PINNED_COUNTRY_CODES;

    return [
      ...PINNED_COUNTRY_CODES.map(toCountry),
      ...COUNTRY_CODES.filter((code) => !pinned.includes(code))
        .map(toCountry)
        .toSorted((a, b) => a.name.localeCompare(b.name, i18n.lang)),
    ];
  }, [formatCountry, i18n.lang]);

  const [code, setCode] = useState(defaultValue);

  const selected = countries.find((country) => country.code === code) ?? null;

  return (
    <Combobox
      items={countries}
      name={name}
      value={selected}
      onValueChange={(country: Nullable<Country>) => setCode(country?.code ?? null)}
      itemToStringLabel={({ name }: Country) => name}
      itemToStringValue={({ code }: Country) => code}
      isItemEqualToValue={(item: Country, value: Country) => item.code === value.code}
      locale={i18n.lang}
    >
      <ComboboxInput id={id} placeholder={i18n.organizations.label.select_country} />

      <ComboboxContent>
        <ComboboxEmpty>{i18n.organizations.text.no_country}</ComboboxEmpty>
        <ComboboxList>
          {(country: Country) => (
            <ComboboxItem key={country.code} value={country}>
              {country.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};
