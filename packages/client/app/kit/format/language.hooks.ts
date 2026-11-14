import { useCallback, useMemo } from "react";
import { DefaultTemplateLanguage } from "@usenullish/nullish-schema/db";
import { useI18n } from "~/kit/i18n/i18n.context";

export const useFormatLanguage = (): ((code: string) => string) => {
  const { i18n } = useI18n();

  const names = useMemo(
    () => new Intl.DisplayNames([i18n.lang], { type: "language" }),
    [i18n.lang],
  );

  return useCallback((code) => names.of(code) ?? code, [names]);
};

export const useDefaultTemplateLanguages = (): {
  value: DefaultTemplateLanguage;
  label: string;
}[] => {
  const formatLanguage = useFormatLanguage();

  return useMemo(
    () =>
      Object.values(DefaultTemplateLanguage).map((language) => ({
        value: language,
        label: formatLanguage(language),
      })),
    [formatLanguage],
  );
};
