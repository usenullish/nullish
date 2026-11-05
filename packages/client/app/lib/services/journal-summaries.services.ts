import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiJournalSummariesSsr } from "~/lib/api/journal-summaries.ssr.api";
import type { ApiJournalGetByIdArgs } from "~/lib/api/_journal";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import { Service } from "./_services";

export class JournalSummariesService extends Service {
  private constructor() {
    super();
  }

  static create(): JournalSummariesService {
    return new this();
  }

  getById = async ({
    cookie,
    id,
  }: {
    cookie: Cookie;
  } & ApiJournalGetByIdArgs): Promise<
    Result<Api["JournalSummaries"]["Client"]["GetJournalSummaryResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiJournalSummariesSsr.create({ cookie }).getById({ id });
    });
  };

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["JournalSummaries"]["Client"]["GetJournalSummariesFilters"]>): Promise<
    Result<Api["JournalSummaries"]["Client"]["GetJournalSummariesResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiJournalSummariesSsr.create({ cookie }).list(rest);
    });
  };
}
