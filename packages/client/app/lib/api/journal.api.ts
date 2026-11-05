import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";
import type { ApiJournalGetByIdArgs } from "~/lib/api/_journal";

export class ApiJournal extends AppApi {
  static create(): ApiJournal {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  submit = async ({
    body,
    orgId,
  }: {
    body: Api["Journal"]["Client"]["CreateJournalEntryBody"];
  } & ApiOrganizationsWritableArgs): Promise<
    Api["Journal"]["Client"]["CreateJournalEntryResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}/accounting/journal`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.Journal.CreateJournalEntryRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /organizations/${orgId}/organizations`,
      });
    }

    const result = await response.json();

    return ApiSchema.Journal.CreateJournalEntryResponseSchema.parse(result);
  };

  update = async ({
    id,
    body,
  }: {
    body: Api["Journal"]["Client"]["UpdateJournalEntryBody"];
  } & ApiJournalGetByIdArgs): Promise<Api["Journal"]["Client"]["UpdateJournalEntryResponse"]> => {
    const response = await fetch(`${this.apiUrl}/accounting/journal/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.Journal.UpdateJournalEntryRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({ response, message: `Cannot patch /accounting/journal/${id}` });
    }

    const result = await response.json();

    return ApiSchema.Journal.UpdateJournalEntryResponseSchema.parse(result);
  };

  delete = async ({
    journalEntryId,
  }: {
    journalEntryId: Api["Journal"]["Client"]["GetJournalEntriesResponse"]["journalEntries"][number]["entry"]["id"];
  }): Promise<void> => {
    const response = await fetch(`${this.apiUrl}/accounting/journal/${journalEntryId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot delete /accounting/journal/${journalEntryId}`,
      });
    }
  };
}
