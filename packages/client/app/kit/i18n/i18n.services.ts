import { createCookie, type LoaderFunctionArgs } from "react-router";
import { type Languages, LanguagesSchema } from "~/kit/i18n/lang";
import { type I18nState, loadLanguage } from "~/kit/i18n/i18n.loaders";
import { preferredLanguage, type Result, tryCatch } from "@usenullish/nullish-common";

const languageCookie = createCookie("nullish-lang", {
  maxAge: 31_536_000, // a year
  path: "/",
  sameSite: "lax",
  secure: import.meta.env.PROD,
});

export const initI18n = async ({ request }: LoaderFunctionArgs): Promise<I18nState> => {
  const cookieHeader = request.headers.get("Cookie");
  const cookie = await languageCookie.parse(cookieHeader);

  const { data } = LanguagesSchema.safeParse(cookie);
  const lang = data ?? preferredLanguage({ request, languages: LanguagesSchema }) ?? "en";

  return await loadLanguage({ lang });
};

const applyLang = ({ lang }: { lang: Languages }) => {
  const { documentElement } = document;
  documentElement.setAttribute("lang", lang);
};

const saveLang = async ({ lang }: { lang: Languages }) => {
  document.cookie = await languageCookie.serialize(lang);
};

export const switchLang = async (args: { lang: Languages }): Promise<Result<I18nState>> => {
  return await tryCatch(async () => {
    const i18n = await loadLanguage(args);
    await saveLang(args);
    applyLang(args);
    return i18n;
  });
};
