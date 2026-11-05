import type { Api } from "@usenullish/nullish-schema/server";

export interface ApiClientsGetByIdArgs {
  id: NonNullable<Api["Clients"]["Client"]["GetClientResponse"]["client"]>["id"];
}

export interface ApiWithClientIdArgs {
  clientId: NonNullable<Api["Clients"]["Client"]["GetClientResponse"]["client"]>["id"];
}

export interface ApiContactsGetByIdArgs {
  id: NonNullable<Api["Contacts"]["Client"]["GetContactResponse"]["contact"]>["id"];
}
