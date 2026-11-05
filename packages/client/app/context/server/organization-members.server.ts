import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { OrganizationMembersService } from "~/lib/services/organization-members.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class OrganizationMembersServer extends ServerLoader {
  #service = OrganizationMembersService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): OrganizationMembersServer {
    return new OrganizationMembersServer({ context: "organization-members" });
  }

  async listOrganizationMembers(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["OrganizationMembers"]["Client"]["GetOrganizationMembersResponse"]>> {
    return await this._loadListNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the team",
      defaultSort: { field: "createdAt", direction: "asc" },
      loaderWithOrgIdFn: this.#service.list,
    });
  }
}
