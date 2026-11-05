import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type {
  ApiDocumentTemplatesWritableArgs,
  ApiTemplateContentsGetByIdArgs,
} from "~/lib/api/_document-templates";

export class ApiTemplateContents extends AppApi {
  static create(): ApiTemplateContents {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  submit = async ({
    body,
    templateId,
  }: {
    body: Api["TemplateContents"]["Client"]["CreateTemplateContentBody"];
  } & ApiDocumentTemplatesWritableArgs): Promise<
    Api["TemplateContents"]["Client"]["CreateTemplateContentResponse"]
  > => {
    const response = await fetch(
      `${this.apiUrl}/billing/document-templates/${templateId}/contents`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: encodeJsonBody({
          schema: ApiSchema.TemplateContents.CreateTemplateContentRequestSchema,
          body,
        }),
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /billing/document-templates/${templateId}/contents`,
      });
    }

    const result = await response.json();

    return ApiSchema.TemplateContents.CreateTemplateContentResponseSchema.parse(result);
  };

  update = async ({
    id,
    body,
  }: {
    body: Api["TemplateContents"]["Client"]["UpdateTemplateContentBody"];
  } & ApiTemplateContentsGetByIdArgs): Promise<
    Api["TemplateContents"]["Client"]["UpdateTemplateContentResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/billing/template-contents/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.TemplateContents.UpdateTemplateContentRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot patch /billing/template-contents/${id}`,
      });
    }

    const result = await response.json();

    return ApiSchema.TemplateContents.UpdateTemplateContentResponseSchema.parse(result);
  };

  delete = async ({ id }: ApiTemplateContentsGetByIdArgs): Promise<void> => {
    const response = await fetch(`${this.apiUrl}/billing/template-contents/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot delete /billing/template-contents/${id}`,
      });
    }
  };
}
