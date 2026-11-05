import type { LoaderFunctionArgs } from "react-router";
import { nonNullish, type Option } from "@usenullish/nullish-common";
import * as z from "zod";
import { type Languages, LanguagesSchema } from "~/kit/i18n/lang";

const AcceptLanguageEntrySchema = z.object({
  lang: LanguagesSchema,
  quality: z.coerce.number().min(0).max(1).default(1),
});

const parseAcceptLanguageEntry = (entry: string) => {
  const [tag, ...params] = entry.split(";").map((part) => part.trim());

  return AcceptLanguageEntrySchema.safeParse({
    lang: tag?.split("-")[0]?.toLowerCase(),
    quality: params.find((param) => param.startsWith("q="))?.slice("q=".length),
  }).data;
};

export const acceptedLang = ({ request }: Pick<LoaderFunctionArgs, "request">): Option<Languages> =>
  (request.headers.get("Accept-Language") ?? "")
    .split(",")
    .map(parseAcceptLanguageEntry)
    .filter(nonNullish)
    .filter(({ quality }) => quality > 0)
    .toSorted((a, b) => b.quality - a.quality)
    .at(0)?.lang;
