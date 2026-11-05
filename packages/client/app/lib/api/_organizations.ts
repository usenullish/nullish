import type { Api } from "@usenullish/nullish-schema/server";

export interface ApiOrganizationsGetByIdArgs {
  orgId: NonNullable<
    Api["Organizations"]["Client"]["GetOrganizationResponse"]["organization"]
  >["id"];
}

export interface ApiOrganizationsWritableArgs {
  orgId: Api["Organizations"]["Client"]["Organization"]["id"];
}
