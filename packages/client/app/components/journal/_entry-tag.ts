import {
  isEmptyString,
  notEmptyString,
  type Nullish,
  toLocalDateString,
} from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";

type JournalSummary = Api["JournalSummaries"]["Client"]["JournalSummary"];

export type EntryTagSource = Pick<JournalSummary, "entry" | "postings">;

const MAX_TEXT_LENGTH = 40;

const toTagText = (text: Nullish<string>): string => {
  const [first, ...rest] = (text ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(notEmptyString);

  if (isEmptyString(first)) {
    return "";
  }

  return rest.reduce(
    ({ tag, full }, word) => {
      const next = `${tag}-${word}`;
      return full || next.length > MAX_TEXT_LENGTH ? { tag, full: true } : { tag: next, full };
    },
    { tag: first.slice(0, MAX_TEXT_LENGTH), full: false },
  ).tag;
};

export const entryTag = ({ entry, postings }: EntryTagSource): string => {
  const firstDescription = postings.find(({ description }) =>
    notEmptyString(description),
  )?.description;

  const text = toTagText([entry.reference, firstDescription].find(notEmptyString));

  return [toLocalDateString(entry.validOn), `${entry.number}`, text]
    .filter(notEmptyString)
    .join("_");
};
