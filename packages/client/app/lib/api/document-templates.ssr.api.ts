import { ApiSsr } from "~/lib/api/_api.ssr";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiDocumentTemplatesGetByIdArgs } from "~/lib/api/_document-templates";

export class ApiDocumentTemplatesSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiDocumentTemplatesSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  getById = async ({
    id,
  }: ApiDocumentTemplatesGetByIdArgs): Promise<
    Api["DocumentTemplates"]["Client"]["GetDocumentTemplateResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/billing/document-templates/${id}`, {
      headers: {
        ...this.cookieHeader(),
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /billing/document-templates/${id}`,
      });
    }

    return ApiSchema.DocumentTemplates.GetDocumentTemplateResponseSchema.parse(
      await response.json(),
    );
  };

  list = async ({
    orgId,
    query,
    filters,
  }: ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["DocumentTemplates"]["Client"]["GetDocumentTemplatesFilters"]>): Promise<
    Api["DocumentTemplates"]["Client"]["GetDocumentTemplatesResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/billing/document-templates?${this.listSearchParams({ query, filters: { values: filters, schema: ApiSchema.DocumentTemplates.GetDocumentTemplatesFiltersQuerySchema } })}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/billing/document-templates`,
      });
    }

    return ApiSchema.DocumentTemplates.GetDocumentTemplatesResponseSchema.parse(
      await response.json(),
    );
  };
}
