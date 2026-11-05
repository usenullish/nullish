import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { JournalSummariesService } from "~/lib/services/journal-summaries.services";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class JournalSummariesServer extends ServerLoader {
  #service = JournalSummariesService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): JournalSummariesServer {
    return new JournalSummariesServer({ context: "journal-summaries" });
  }

  async getJournalSummary(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["JournalSummaries"]["Client"]["GetJournalSummaryResponse"]>> {
    return await this._loadNestedWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the journal entry",
        missingId: "Missing journal entry ID",
      },
      loaderWithIdsFn: this.#service.getById,
    });
  }

  async listJournalSummaries(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["JournalSummaries"]["Client"]["GetJournalSummariesResponse"]>> {
    return await this._loadListNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the journal",
      defaultSort: { field: "validOn", direction: "desc" },
      filtersSchema: ApiSchema.JournalSummaries.GetJournalSummariesFiltersQuerySchema,
      loaderWithOrgIdFn: this.#service.list,
    });
  }
}
