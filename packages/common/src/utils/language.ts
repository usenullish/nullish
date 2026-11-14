import * as z from "zod";
import { nonNullish } from "../asserts/nullish";
import type { Option } from "../option";

const parseAcceptLanguageEntry = <T extends string>({
  entry,
  languages,
}: {
  entry: string;
  languages: z.ZodType<T>;
}) => {
  const [tag, ...params] = entry.split(";").map((part) => part.trim());

  return z
    .object({
      lang: languages,
      quality: z.coerce.number().min(0).max(1).default(1),
    })
    .safeParse({
      lang: tag?.split("-")[0]?.toLowerCase(),
      quality: params.find((param) => param.startsWith("q="))?.slice("q=".length),
    }).data;
};

export const preferredLanguage = <T extends string>({
  request,
  languages,
}: {
  request: Request;
  languages: z.ZodType<T>;
}): Option<T> =>
  (request.headers.get("Accept-Language") ?? "")
    .split(",")
    .map((entry) => parseAcceptLanguageEntry({ entry, languages }))
    .filter(nonNullish)
    .filter(({ quality }) => quality > 0)
    .toSorted((a, b) => b.quality - a.quality)
    .at(0)?.lang;
