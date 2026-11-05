import type { LoaderFunctionArgs } from "react-router";
import { type Nullish, tryCatch } from "@usenullish/nullish-common";
import { initTheme, type Theme } from "~/kit/theme/theme.services";
import { initI18n } from "~/kit/i18n/i18n.services";
import { enI18n, type I18nState } from "~/kit/i18n/i18n.loaders";
import { DEFAULT_NO_PRIVACY, initPrivacy, type Privacy } from "~/kit/privacy/privacy.services";
import { Environment, initEnvironment } from "~/kit/environment/environment.services";

interface Kit {
  theme: Theme;
  i18n: I18nState;
  privacy: Privacy;
  environment: Nullish<Environment>;
}

export const DEFAULT_KIT: Kit = {
  theme: "system",
  i18n: enI18n(),
  privacy: DEFAULT_NO_PRIVACY,
  environment: undefined,
};

export const initKit = async (args: LoaderFunctionArgs): Promise<Kit> => {
  const result = await tryCatch(async () => {
    const [theme, i18n, privacy, environment] = await Promise.all([
      initTheme(args),
      initI18n(args),
      initPrivacy(args),
      initEnvironment(),
    ]);
    return { theme, i18n, privacy, environment };
  });

  // For simplicity reason and to not block the experience we fallback to defaults
  // instead of showing user errors right from the start given that loading languages and theme
  // should most probably work out.
  if (result.status === "error") {
    console.error(result.err);

    return DEFAULT_KIT;
  }

  return result.result;
};
