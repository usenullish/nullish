import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { isEmptyString, type Option } from "@usenullish/nullish-common";
import { TemplateContentsService } from "~/lib/services/document-templates+contents.services";

export class TemplateContentsServer extends ServerLoader {
  #service = TemplateContentsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): TemplateContentsServer {
    return new TemplateContentsServer({ context: "document-templates+contents" });
  }

  async listContentsByTemplateId(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["TemplateContents"]["Client"]["GetTemplateContentsResponse"]>> {
    return await this._loadListWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the contents of the document template",
        missingId: "Missing document template ID",
      },
      defaultSort: { field: "language", direction: "asc" },
      filtersSchema: ApiSchema.TemplateContents.GetTemplateContentsFiltersQuerySchema,
      loaderWithIdFn: this.#service.list,
    });
  }

  async listAllContents({
    args,
    templateIds,
  }: {
    args: LoaderFunctionArgs;
    templateIds: Api["DocumentTemplates"]["Client"]["DocumentTemplate"]["id"][];
  }): Promise<Option<Api["TemplateContents"]["Client"]["GetTemplateContentsResponse"]>> {
    return await this._load({
      args,
      errorFallbackMsg: "Unexpected error while loading the contents of the document templates",
      loaderFn: async ({ cookie }) => await this.#service.listAll({ cookie, ids: templateIds }),
    });
  }

  async getContent(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["TemplateContents"]["Client"]["GetTemplateContentResponse"]>> {
    const contentId = args.params["content-id"];

    if (isEmptyString(contentId)) {
      return undefined;
    }

    return await this._load({
      args,
      errorFallbackMsg: "Unexpected error while loading the document template content",
      loaderFn: async ({ cookie }) => await this.#service.getById({ cookie, id: contentId }),
    });
  }
}
