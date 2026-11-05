import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";
import type { Cookie } from "~/lib/schemas/cookie";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { ApiOrganizationsSsr } from "~/lib/api/organizations.ssr.api";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiOrganizations } from "~/lib/api/organizations.api";
import { Service } from "./_services";

export class OrganizationsService extends Service {
  private constructor() {
    super();
  }

  static create(): OrganizationsService {
    return new this();
  }

  listAll = async (args: {
    cookie: Cookie;
  }): Promise<Result<Api["Organizations"]["Client"]["GetOrganizationsResponse"]>> => {
    return await tryCatch(async () => {
      const api = ApiOrganizationsSsr.create(args);

      const organizations = await this._listAll({
        listFn: async (query) => {
          const { organizations } = await api.list({ query });
          return organizations;
        },
      });

      return { organizations };
    });
  };

  submit = async ({
    organization,
  }: {
    organization: Api["Organizations"]["Client"]["CreateOrganizationBody"];
  }): Promise<Result<Api["Organizations"]["Client"]["CreateOrganizationResponse"]>> => {
    try {
      const result = await ApiOrganizations.create().submit({
        body: organization,
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
    orgId: Api["Organizations"]["Client"]["Organization"]["id"];
    values: Api["Organizations"]["Client"]["UpdateOrganizationBody"];
  }): Promise<Result<Api["Organizations"]["Client"]["UpdateOrganizationResponse"]>> => {
    try {
      const result = await ApiOrganizations.create().update({
        ...rest,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  delete = async ({ orgId }: ApiOrganizationsWritableArgs): Promise<Result<void>> => {
    return await tryCatch(async () => {
      await ApiOrganizations.create().delete({ orgId });
    });
  };
}
