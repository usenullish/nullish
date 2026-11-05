import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { DocumentTemplatesService } from "~/lib/services/document-templates.services";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class DocumentTemplatesServer extends ServerLoader {
  #service = DocumentTemplatesService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): DocumentTemplatesServer {
    return new DocumentTemplatesServer({ context: "document-templates" });
  }

  async listDocumentTemplates(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["DocumentTemplates"]["Client"]["GetDocumentTemplatesResponse"]>> {
    return await this._loadListNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the document templates",
      defaultSort: { field: "createdAt", direction: "asc" },
      filtersSchema: ApiSchema.DocumentTemplates.GetDocumentTemplatesFiltersQuerySchema,
      loaderWithOrgIdFn: this.#service.list,
    });
  }

  async listAllDocumentTemplates(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["DocumentTemplates"]["Client"]["GetDocumentTemplatesResponse"]>> {
    return await this._loadNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the document templates",
      loaderWithOrgIdFn: this.#service.listAll,
    });
  }

  async getDocumentTemplate(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["DocumentTemplates"]["Client"]["GetDocumentTemplateResponse"]>> {
    return await this._loadNestedWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the document template",
        missingId: "Missing document template ID",
      },
      loaderWithIdsFn: this.#service.getById,
    });
  }
}
