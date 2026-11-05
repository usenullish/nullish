import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiJournal } from "~/lib/api/journal.api";
import type { ApiJournalGetByIdArgs } from "~/lib/api/_journal";
import { Service } from "./_services";

export class JournalService extends Service {
  private constructor() {
    super();
  }

  static create(): JournalService {
    return new this();
  }

  submit = async ({
    body,
    organizationId,
  }: {
    body: Api["Journal"]["Client"]["CreateJournalEntryBody"];
    organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  }): Promise<Result<Api["Journal"]["Client"]["CreateJournalEntryResponse"]>> => {
    try {
      const result = await ApiJournal.create().submit({
        body,
        orgId: organizationId,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  update = async ({
    values: body,
    ...rest
  }: {
    values: Api["Journal"]["Client"]["UpdateJournalEntryBody"];
  } & ApiJournalGetByIdArgs): Promise<
    Result<Api["Journal"]["Client"]["UpdateJournalEntryResponse"]>
  > => {
    try {
      const result = await ApiJournal.create().update({
        ...rest,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  delete = async ({
    journalEntryId,
  }: {
    journalEntryId: Api["Journal"]["Client"]["GetJournalEntriesResponse"]["journalEntries"][number]["entry"]["id"];
  }): Promise<Result<void>> => {
    return await tryCatch(async () => {
      await ApiJournal.create().delete({ journalEntryId });
    });
  };
}
