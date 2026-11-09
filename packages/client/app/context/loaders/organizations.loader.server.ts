import type { LoaderFunctionArgs } from "react-router";
import { isNullish, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { OrganizationsServer } from "~/context/server/organizations.server";

type Organizations = Option<Api["Organizations"]["Client"]["GetOrganizationsResponse"]>;

export class OrganizationsLoader {
  readonly #args: LoaderFunctionArgs;
  #organizations: Option<Promise<Organizations>>;

  private constructor(args: LoaderFunctionArgs) {
    this.#args = args;
  }

  static create(args: LoaderFunctionArgs): OrganizationsLoader {
    return new this(args);
  }

  listAll(): Promise<Organizations> {
    if (isNullish(this.#organizations)) {
      this.#organizations = OrganizationsServer.create().listAllOrganizations(this.#args);
    }

    return this.#organizations;
  }
}
