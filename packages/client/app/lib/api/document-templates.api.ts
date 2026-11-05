import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";
import type { ApiDocumentTemplatesWritableArgs } from "~/lib/api/_document-templates";

export class ApiDocumentTemplates extends AppApi {
  static create(): ApiDocumentTemplates {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  update = async ({
    templateId,
    body,
  }: {
    body: Api["DocumentTemplates"]["Client"]["UpdateDocumentTemplateBody"];
  } & ApiDocumentTemplatesWritableArgs): Promise<
    Api["DocumentTemplates"]["Client"]["UpdateDocumentTemplateResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/billing/document-templates/${templateId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.DocumentTemplates.UpdateDocumentTemplateRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot patch /billing/document-templates/${templateId}`,
      });
    }

    const result = await response.json();

    return ApiSchema.DocumentTemplates.UpdateDocumentTemplateResponseSchema.parse(result);
  };

  submit = async ({
    body,
    orgId,
  }: {
    body: Api["DocumentTemplates"]["Client"]["CreateDocumentTemplateBody"];
  } & ApiOrganizationsWritableArgs): Promise<
    Api["DocumentTemplates"]["Client"]["CreateDocumentTemplateResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/billing/document-templates`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: encodeJsonBody({
          schema: ApiSchema.DocumentTemplates.CreateDocumentTemplateRequestSchema,
          body,
        }),
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /organizations/${orgId}/billing/document-templates`,
      });
    }

    const result = await response.json();

    return ApiSchema.DocumentTemplates.CreateDocumentTemplateResponseSchema.parse(result);
  };

  delete = async ({ templateId }: ApiDocumentTemplatesWritableArgs): Promise<void> => {
    const response = await fetch(`${this.apiUrl}/billing/document-templates/${templateId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot delete /billing/document-templates/${templateId}`,
      });
    }
  };
}
