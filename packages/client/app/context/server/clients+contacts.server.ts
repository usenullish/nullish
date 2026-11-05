import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { isEmptyString, type Option } from "@usenullish/nullish-common";
import { ContactsService } from "~/lib/services/clients+contacts.services";

export class ContactsServer extends ServerLoader {
  #service = ContactsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): ContactsServer {
    return new ContactsServer({ context: "clients+contacts" });
  }

  async listContactsByClientId(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["Contacts"]["Client"]["GetContactsResponse"]>> {
    return await this._loadListWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the contacts of the client",
        missingId: "Missing client ID",
      },
      defaultSort: { field: "createdAt", direction: "asc" },
      filtersSchema: ApiSchema.Contacts.GetContactsFiltersQuerySchema,
      loaderWithIdFn: this.#service.list,
    });
  }

  async getContact(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["Contacts"]["Client"]["GetContactResponse"]>> {
    const contactId = args.params["contact-id"];

    if (isEmptyString(contactId)) {
      return undefined;
    }

    return await this._load({
      args,
      errorFallbackMsg: "Unexpected error while loading the contact",
      loaderFn: async ({ cookie }) => await this.#service.getById({ cookie, id: contactId }),
    });
  }
}
