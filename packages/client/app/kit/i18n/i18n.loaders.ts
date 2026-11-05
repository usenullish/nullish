import en from "~/assets/i18n/en.json";
import type { Languages } from "~/kit/i18n/lang";
import { type I18n, I18nSchema } from "~/kit/i18n/i18n";

export type I18nState = I18n & { lang: Languages };

export const enI18n = (): I18nState => ({
  lang: "en",
  ...I18nSchema.parse(en),
});

const frI18n = async (): Promise<I18nState> => ({
  lang: "fr",
  ...I18nSchema.parse((await import("~/assets/i18n/fr.json")).default),
});

const deI18n = async (): Promise<I18nState> => ({
  lang: "de",
  ...I18nSchema.parse((await import("~/assets/i18n/de.json")).default),
});

const itI18n = async (): Promise<I18nState> => ({
  lang: "it",
  ...I18nSchema.parse((await import("~/assets/i18n/it.json")).default),
});

export const loadLanguage = ({ lang }: { lang: Languages }): Promise<I18nState> => {
  switch (lang) {
    case "fr":
      return frI18n();
    case "de":
      return deI18n();
    case "it":
      return itI18n();
    default:
      return Promise.resolve(enI18n());
  }
};
