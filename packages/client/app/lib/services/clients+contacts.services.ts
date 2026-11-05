import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiContactsSsr } from "~/lib/api/clients+contacts.ssr.api";
import type {
  ApiClientsGetByIdArgs,
  ApiContactsGetByIdArgs,
  ApiWithClientIdArgs,
} from "~/lib/api/_clients";
import { ApiContacts } from "~/lib/api/clients+contacts.api";
import { Service } from "./_services";

export class ContactsService extends Service {
  private constructor() {
    super();
  }

  static create(): ContactsService {
    return new this();
  }

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiClientsGetByIdArgs &
    ApiListArgs<Api["Contacts"]["Client"]["GetContactsFilters"]>): Promise<
    Result<Api["Contacts"]["Client"]["GetContactsResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiContactsSsr.create({ cookie }).list(rest);
    });
  };

  submit = async ({
    clientId,
    contact,
  }: {
    clientId: ApiWithClientIdArgs["clientId"];
    contact: Api["Contacts"]["Client"]["CreateContactBody"];
  }): Promise<Result<Api["Contacts"]["Client"]["CreateContactResponse"]>> => {
    try {
      const result = await ApiContacts.create().submit({
        body: contact,
        clientId,
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
  } & ApiContactsGetByIdArgs): Promise<Result<Api["Contacts"]["Client"]["GetContactResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiContactsSsr.create({ cookie }).getById({ id });
    });
  };

  update = async ({
    values: body,
    ...rest
  }: {
    values: Api["Contacts"]["Client"]["UpdateContactBody"];
  } & ApiContactsGetByIdArgs): Promise<
    Result<Api["Contacts"]["Client"]["UpdateContactResponse"]>
  > => {
    try {
      const result = await ApiContacts.create().update({
        ...rest,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  delete = async ({ id }: ApiContactsGetByIdArgs): Promise<Result<void>> => {
    return await tryCatch(async () => {
      await ApiContacts.create().delete({ id });
    });
  };
}
