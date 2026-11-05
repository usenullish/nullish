import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiOrganizationMembersSsr } from "~/lib/api/organization-members.ssr.api";
import { ApiOrganizationMembers } from "~/lib/api/organization-members.api";
import type { ApiOrganizationMembersWritableArgs } from "~/lib/api/_organization-members";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import { Service } from "./_services";

export class OrganizationMembersService extends Service {
  private constructor() {
    super();
  }

  static create(): OrganizationMembersService {
    return new this();
  }

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    ApiListArgs): Promise<
    Result<Api["OrganizationMembers"]["Client"]["GetOrganizationMembersResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiOrganizationMembersSsr.create({ cookie }).list(rest);
    });
  };

  delete = async ({ membershipId }: ApiOrganizationMembersWritableArgs): Promise<Result<void>> => {
    return await tryCatch(async () => {
      await ApiOrganizationMembers.create().delete({ membershipId });
    });
  };
}
