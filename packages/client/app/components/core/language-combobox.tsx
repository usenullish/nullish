import { useState } from "react";
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
import { LanguagesSchema } from "~/kit/i18n/lang";
import { useFormatLanguage } from "~/kit/format/language.hooks";

interface Language {
  code: string;
  name: string;
}

export const LanguageCombobox = ({
  id,
  name,
  defaultValue,
  required,
}: {
  id: string;
  name: string;
  defaultValue: Nullable<string>;
  required?: boolean;
}) => {
  const { i18n } = useI18n();
  const formatLanguage = useFormatLanguage();

  const languages = LanguagesSchema.options.map((code) => ({ code, name: formatLanguage(code) }));

  const [code, setCode] = useState(defaultValue);

  const selected = languages.find((language) => language.code === code) ?? null;

  return (
    <Combobox
      items={languages}
      name={name}
      value={selected}
      onValueChange={(language: Nullable<Language>) => setCode(language?.code ?? null)}
      itemToStringLabel={({ name }: Language) => name}
      itemToStringValue={({ code }: Language) => code}
      isItemEqualToValue={(item: Language, value: Language) => item.code === value.code}
      locale={i18n.lang}
    >
      <ComboboxInput id={id} placeholder={i18n.core.label.select_language} required={required} />

      <ComboboxContent>
        <ComboboxEmpty>{i18n.core.text.no_language}</ComboboxEmpty>
        <ComboboxList>
          {(language: Language) => (
            <ComboboxItem key={language.code} value={language}>
              {language.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};
