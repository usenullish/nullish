import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { InvitationsService } from "~/lib/services/invitations.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class InvitationsServer extends ServerLoader {
  #service = InvitationsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): InvitationsServer {
    return new InvitationsServer({ context: "invitations" });
  }

  async listInvitations(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["Invitations"]["Client"]["GetInvitationsResponse"]>> {
    return await this._loadListNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the invitations",
      defaultSort: { field: "createdAt", direction: "desc" },
      loaderWithOrgIdFn: this.#service.list,
    });
  }
}
