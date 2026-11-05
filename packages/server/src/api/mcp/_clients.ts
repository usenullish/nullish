import { DbCollectionClients, DbClients } from "@usenullish/nullish-engine/billing";
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

type SelectClients = Records["Billing"]["Clients"]["Select"];
type FilterClients = Records["Billing"]["Clients"]["Filter"];

export class McpToolsClients extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsClients {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListClients();
    this.#registerGetClient();
  }

  override registerWriteTools() {
    this.#registerCreateClient();
    this.#registerUpdateClient();
    this.#registerDeleteClient();
  }

  #registerListClients() {
    this.registerTool({
      title: "list_clients",
      annotations: READ_ONLY_TOOL,
      description: "Returns the clients of an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.Clients.GetClientsFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(ApiSchema.Clients.GetClientsResponseSchema),
      fn: async ({ organizationId, query, filters }) => {
        const store: DbCollectionStore<SelectClients, unknown, string, FilterClients> =
          DbCollectionClients.create({
            ...this._args,
            foreignKeyId: organizationId,
          });

        const result = await store.list({ ...query, filters });

        return this.mapResult(result, (clients) => ({
          clients: clients.map(this.#encodeResponse),
        }));
      },
    });
  }

  #registerGetClient() {
    this.registerTool({
      title: "get_client",
      annotations: READ_ONLY_TOOL,
      description: "Returns a client by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.Clients.GetClientsRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.Clients.GetClientResponseSchema),
      fn: async ({ id }) => {
        const result = await DbClients.create(this._args).find({ pKey: id });

        return this.mapResult(result, (client) => ({
          client: nonNullish(client) ? this.#encodeResponse(client) : client,
        }));
      },
    });
  }

  #registerCreateClient() {
    this.registerTool({
      title: "create_client",
      annotations: WRITE_TOOL,
      description: "Creates a client for an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        values: ApiSchema.Clients.CreateClientRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.Clients.CreateClientResponseSchema),
      fn: async ({ organizationId, values }) => {
        const result = await DbCollectionClients.create({
          ...this._args,
          foreignKeyId: organizationId,
        }).insert({ values });

        return this.mapResult(result, (client) => ({
          client: this.#encodeResponse(client),
        }));
      },
    });
  }

  #registerUpdateClient() {
    this.registerTool({
      title: "update_client",
      annotations: UPDATE_TOOL,
      description: "Updates a client. The current version must be provided for optimistic locking.",
      inputSchema: z.strictObject({
        id: ApiSchema.Clients.GetClientsRequestSchema.shape.id,
        values: ApiSchema.Clients.UpdateClientRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.Clients.UpdateClientResponseSchema),
      fn: async ({ id, values }) => {
        const result = await DbClients.create(this._args).update({ values, pKey: id });

        return this.mapResult(result, (client) => ({
          client: this.#encodeResponse(client),
        }));
      },
    });
  }

  #registerDeleteClient() {
    this.registerTool({
      title: "delete_client",
      annotations: DELETE_TOOL,
      description: "Deletes a client with its contacts. A client with invoices cannot be deleted.",
      inputSchema: z.strictObject({
        id: ApiSchema.Clients.GetClientsRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.Clients.GetClientResponseSchema),
      fn: async ({ id }) => {
        const result = await DbClients.create(this._args).delete({ pKey: id });

        return this.mapResult(result, (client) => ({
          client: nonNullish(client) ? this.#encodeResponse(client) : client,
        }));
      },
    });
  }

  #encodeResponse = (client: SelectClients) => encodeAuditFieldsResponse(client);
}
