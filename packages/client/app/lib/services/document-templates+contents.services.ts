import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiTemplateContentsSsr } from "~/lib/api/document-templates+contents.ssr.api";
import type {
  ApiDocumentTemplatesGetByIdArgs,
  ApiDocumentTemplatesWritableArgs,
  ApiTemplateContentsGetByIdArgs,
} from "~/lib/api/_document-templates";
import { ApiTemplateContents } from "~/lib/api/document-templates+contents.api";
import { Service } from "./_services";

export class TemplateContentsService extends Service {
  private constructor() {
    super();
  }

  static create(): TemplateContentsService {
    return new this();
  }

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiDocumentTemplatesGetByIdArgs &
    ApiListArgs<Api["TemplateContents"]["Client"]["GetTemplateContentsFilters"]>): Promise<
    Result<Api["TemplateContents"]["Client"]["GetTemplateContentsResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiTemplateContentsSsr.create({ cookie }).list(rest);
    });
  };

  listAll = async ({
    cookie,
    ids,
  }: {
    cookie: Cookie;
    ids: ApiDocumentTemplatesGetByIdArgs["id"][];
  }): Promise<Result<Api["TemplateContents"]["Client"]["GetTemplateContentsResponse"]>> => {
    return await tryCatch(async () => {
      const api = ApiTemplateContentsSsr.create({ cookie });

      const contents = await Promise.all(
        ids.map((id) =>
          this._listAll({
            listFn: async (query) => {
              const { contents } = await api.list({ id, query });
              return contents;
            },
          }),
        ),
      );

      return { contents: contents.flat() };
    });
  };

  submit = async ({
    templateId,
    content,
  }: {
    templateId: ApiDocumentTemplatesWritableArgs["templateId"];
    content: Api["TemplateContents"]["Client"]["CreateTemplateContentBody"];
  }): Promise<Result<Api["TemplateContents"]["Client"]["CreateTemplateContentResponse"]>> => {
    try {
      const result = await ApiTemplateContents.create().submit({
        body: content,
        templateId,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  getById = async ({
    cookie,
    id,
  }: {
    cookie: Cookie;
  } & ApiTemplateContentsGetByIdArgs): Promise<
    Result<Api["TemplateContents"]["Client"]["GetTemplateContentResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiTemplateContentsSsr.create({ cookie }).getById({ id });
    });
  };

  update = async ({
    values: body,
    ...rest
  }: {
    values: Api["TemplateContents"]["Client"]["UpdateTemplateContentBody"];
  } & ApiTemplateContentsGetByIdArgs): Promise<
    Result<Api["TemplateContents"]["Client"]["UpdateTemplateContentResponse"]>
  > => {
    try {
      const result = await ApiTemplateContents.create().update({
        ...rest,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  delete = async ({ id }: ApiTemplateContentsGetByIdArgs): Promise<Result<void>> => {
    return await tryCatch(async () => {
      await ApiTemplateContents.create().delete({ id });
    });
  };
}
