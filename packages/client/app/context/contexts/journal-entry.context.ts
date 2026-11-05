import { createContext } from "react";
import { assertNonNullish, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { useContext } from "react";

export const NonNullishJournalEntryContext =
  createContext<
    Option<Api["JournalSummaries"]["Client"]["GetJournalSummaryResponse"]["journalSummary"]>
  >(undefined);

export const useJournalEntry = () => {
  const journalEntry = useContext(NonNullishJournalEntryContext);
  assertNonNullish(journalEntry);
  return journalEntry;
};
