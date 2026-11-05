import type { Api } from "@usenullish/nullish-schema/server";

export interface ApiJournalGetByIdArgs {
  id: Api["Journal"]["Client"]["GetJournalEntriesResponse"]["journalEntries"][number]["entry"]["id"];
}
