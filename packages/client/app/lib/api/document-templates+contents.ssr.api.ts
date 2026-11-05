import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type {
  ApiDocumentTemplatesGetByIdArgs,
  ApiTemplateContentsGetByIdArgs,
} from "~/lib/api/_document-templates";

export class ApiTemplateContentsSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiTemplateContentsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  list = async ({
    id,
    query,
    filters,
  }: ApiDocumentTemplatesGetByIdArgs &
    ApiListArgs<Api["TemplateContents"]["Client"]["GetTemplateContentsFilters"]>): Promise<
    Api["TemplateContents"]["Client"]["GetTemplateContentsResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/billing/document-templates/${id}/contents?${this.listSearchParams({ query, filters: { values: filters, schema: ApiSchema.TemplateContents.GetTemplateContentsFiltersQuerySchema } })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /billing/document-templates/${id}/contents`,
      });
    }

    return ApiSchema.TemplateContents.GetTemplateContentsResponseSchema.parse(
      await response.json(),
    );
  };

  getById = async ({
    id,
  }: ApiTemplateContentsGetByIdArgs): Promise<
    Api["TemplateContents"]["Client"]["GetTemplateContentResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/billing/template-contents/${id}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /billing/template-contents/${id}`,
      });
    }

    return ApiSchema.TemplateContents.GetTemplateContentResponseSchema.parse(await response.json());
  };
}
