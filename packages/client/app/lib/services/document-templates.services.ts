import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { ApiDocumentTemplatesSsr } from "~/lib/api/document-templates.ssr.api";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiDocumentTemplates } from "~/lib/api/document-templates.api";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type {
  ApiDocumentTemplatesGetByIdArgs,
  ApiDocumentTemplatesWritableArgs,
} from "~/lib/api/_document-templates";
import { Service } from "./_services";

export class DocumentTemplatesService extends Service {
  private constructor() {
    super();
  }

  static create(): DocumentTemplatesService {
    return new this();
  }

  getById = async ({
    cookie,
    id,
  }: {
    cookie: Cookie;
  } & ApiDocumentTemplatesGetByIdArgs): Promise<
    Result<Api["DocumentTemplates"]["Client"]["GetDocumentTemplateResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiDocumentTemplatesSsr.create({ cookie }).getById({ id });
    });
  };

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    ApiListArgs<Api["DocumentTemplates"]["Client"]["GetDocumentTemplatesFilters"]>): Promise<
    Result<Api["DocumentTemplates"]["Client"]["GetDocumentTemplatesResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiDocumentTemplatesSsr.create({ cookie }).list(rest);
    });
  };

  listAll = async ({
    cookie,
    orgId,
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["DocumentTemplates"]["Client"]["GetDocumentTemplatesResponse"]>
  > => {
    return await tryCatch(async () => {
      const api = ApiDocumentTemplatesSsr.create({ cookie });

      const templates = await this._listAll({
        listFn: async (query) => {
          const { templates } = await api.list({ orgId, query });
          return templates;
        },
      });

      return { templates };
    });
  };

  submit = async ({
    template,
    organizationId,
  }: {
    template: Api["DocumentTemplates"]["Client"]["CreateDocumentTemplateBody"];
    organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  }): Promise<Result<Api["DocumentTemplates"]["Client"]["CreateDocumentTemplateResponse"]>> => {
    try {
      const result = await ApiDocumentTemplates.create().submit({
        body: template,
        orgId: organizationId,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  update = async ({
    values: body,
    ...rest
  }: {
    templateId: Api["DocumentTemplates"]["Client"]["DocumentTemplate"]["id"];
    values: Api["DocumentTemplates"]["Client"]["UpdateDocumentTemplateBody"];
  }): Promise<Result<Api["DocumentTemplates"]["Client"]["UpdateDocumentTemplateResponse"]>> => {
    try {
      const result = await ApiDocumentTemplates.create().update({
        ...rest,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  delete = async ({ templateId }: ApiDocumentTemplatesWritableArgs): Promise<Result<void>> => {
    return await tryCatch(async () => {
      await ApiDocumentTemplates.create().delete({ templateId });
    });
  };
}
