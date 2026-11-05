import type { Api } from "@usenullish/nullish-schema/server";

export interface ApiDocumentTemplatesGetByIdArgs {
  id: NonNullable<
    Api["DocumentTemplates"]["Client"]["GetDocumentTemplateResponse"]["template"]
  >["id"];
}

export interface ApiDocumentTemplatesWritableArgs {
  templateId: Api["DocumentTemplates"]["Client"]["DocumentTemplate"]["id"];
}

export interface ApiTemplateContentsGetByIdArgs {
  id: NonNullable<Api["TemplateContents"]["Client"]["GetTemplateContentResponse"]["content"]>["id"];
}
