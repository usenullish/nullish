import { DbCollectionContacts, DbContacts } from "@usenullish/nullish-engine/billing";
import type { DbCollectionStore } from "@usenullish/nullish-engine";
import {
  ApiSchema,
  CommonSchema,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import { nonNullish } from "@usenullish/nullish-common";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import {
  DELETE_TOOL,
  WRITE_TOOL,
  READ_ONLY_TOOL,
  McpTools,
  type McpToolsInitArgs,
  UPDATE_TOOL,
} from "./_tools";

type SelectContacts = Records["Billing"]["Contacts"]["Select"];
type FilterContacts = Records["Billing"]["Contacts"]["Filter"];

export class McpToolsContacts extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsContacts {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListContacts();
    this.#registerGetContact();
  }

  override registerWriteTools() {
    this.#registerCreateContact();
    this.#registerUpdateContact();
    this.#registerDeleteContact();
  }

  #registerListContacts() {
    this.registerTool({
      title: "list_contacts",
      annotations: READ_ONLY_TOOL,
      description: "Returns the contacts of a client.",
      inputSchema: z.strictObject({
        clientId: ApiSchema.Clients.GetClientsRequestSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.Contacts.GetContactsFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(ApiSchema.Contacts.GetContactsResponseSchema),
      fn: async ({ clientId, query, filters }) => {
        const store: DbCollectionStore<SelectContacts, unknown, string, FilterContacts> =
          DbCollectionContacts.create({
            ...this._args,
            foreignKeyId: clientId,
          });

        const result = await store.list({ ...query, filters });

        return this.mapResult(result, (contacts) => ({
          contacts: contacts.map(this.#encodeResponse),
        }));
      },
    });
  }

  #registerGetContact() {
    this.registerTool({
      title: "get_contact",
      annotations: READ_ONLY_TOOL,
      description: "Returns a contact by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.Contacts.GetContactsRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.Contacts.GetContactResponseSchema),
      fn: async ({ id }) => {
        const result = await DbContacts.create(this._args).find({ pKey: id });

        return this.mapResult(result, (contact) => ({
          contact: nonNullish(contact) ? this.#encodeResponse(contact) : contact,
        }));
      },
    });
  }

  #registerCreateContact() {
    this.registerTool({
      title: "create_contact",
      annotations: WRITE_TOOL,
      description: "Creates a contact for a client.",
      inputSchema: z.strictObject({
        clientId: ApiSchema.Clients.GetClientsRequestSchema.shape.id,
        values: ApiSchema.Contacts.CreateContactRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.Contacts.CreateContactResponseSchema),
      fn: async ({ clientId, values }) => {
        const result = await DbCollectionContacts.create({
          ...this._args,
          foreignKeyId: clientId,
        }).insert({ values });

        return this.mapResult(result, (contact) => ({
          contact: this.#encodeResponse(contact),
        }));
      },
    });
  }

  #registerUpdateContact() {
    this.registerTool({
      title: "update_contact",
      annotations: UPDATE_TOOL,
      description:
        "Updates a contact. The current version must be provided for optimistic locking.",
      inputSchema: z.strictObject({
        id: ApiSchema.Contacts.GetContactsRequestSchema.shape.id,
        values: ApiSchema.Contacts.UpdateContactRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.Contacts.UpdateContactResponseSchema),
      fn: async ({ id, values }) => {
        const result = await DbContacts.create(this._args).update({ values, pKey: id });

        return this.mapResult(result, (contact) => ({
          contact: this.#encodeResponse(contact),
        }));
      },
    });
  }

  #registerDeleteContact() {
    this.registerTool({
      title: "delete_contact",
      annotations: DELETE_TOOL,
      description: "Deletes a contact of a client.",
      inputSchema: z.strictObject({
        id: ApiSchema.Contacts.GetContactsRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.Contacts.GetContactResponseSchema),
      fn: async ({ id }) => {
        const result = await DbContacts.create(this._args).delete({ pKey: id });

        return this.mapResult(result, (contact) => ({
          contact: nonNullish(contact) ? this.#encodeResponse(contact) : contact,
        }));
      },
    });
  }

  #encodeResponse = (contact: SelectContacts) => encodeAuditFieldsResponse(contact);
}
