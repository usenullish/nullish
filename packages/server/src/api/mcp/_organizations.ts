import { DbOrganizations } from "@usenullish/nullish-engine/core";
import type { DbCollectionStore } from "@usenullish/nullish-engine";
import {
  ApiSchema,
  CommonSchema,
  encodeOrganizationResponse,
} from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import { nonNullish } from "@usenullish/nullish-common";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import { WRITE_TOOL, READ_ONLY_TOOL, McpTools, type McpToolsInitArgs, UPDATE_TOOL } from "./_tools";

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];
type FilterOrganizations = Records["Core"]["Organizations"]["Filter"];

export class McpToolsOrganizations extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsOrganizations {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListOrganizations();
    this.#registerGetOrganization();
  }

  override registerWriteTools() {
    this.#registerCreateOrganization();
    this.#registerUpdateOrganization();
  }

  #registerListOrganizations() {
    this.registerTool({
      title: "list_organizations",
      annotations: READ_ONLY_TOOL,
      description: "Returns the organizations the current user is a member of.",
      inputSchema: z.strictObject({
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.Organizations.GetOrganizationsFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(ApiSchema.Organizations.GetOrganizationsResponseSchema),
      fn: async ({ query, filters }) => {
        const store: DbCollectionStore<SelectOrganizations, unknown, string, FilterOrganizations> =
          DbOrganizations.create(this._args);

        const result = await store.list({ ...query, filters });

        return this.mapResult(result, (organizations) => ({
          organizations: organizations.map(encodeOrganizationResponse),
        }));
      },
    });
  }

  #registerGetOrganization() {
    this.registerTool({
      title: "get_organization",
      annotations: READ_ONLY_TOOL,
      description: "Returns an organization by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.Organizations.OrganizationSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.Organizations.GetOrganizationResponseSchema),
      fn: async ({ id }) => {
        const result = await DbOrganizations.create(this._args).find({ pKey: id });

        return this.mapResult(result, (organization) => ({
          organization: nonNullish(organization)
            ? encodeOrganizationResponse(organization)
            : organization,
        }));
      },
    });
  }

  #registerCreateOrganization() {
    this.registerTool({
      title: "create_organization",
      annotations: WRITE_TOOL,
      description:
        "Creates an organization. The current user becomes its admin and the organization is seeded with the chart of accounts, the system accounts, the accounting settings and the billing settings, which can then be reviewed and adjusted.",
      inputSchema: z.strictObject({
        values: ApiSchema.Organizations.CreateOrganizationRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.Organizations.CreateOrganizationResponseSchema),
      fn: async ({ values }) => {
        const result = await DbOrganizations.create(this._args).insert({ values });

        return this.mapResult(result, (organization) => ({
          organization: encodeOrganizationResponse(organization),
        }));
      },
    });
  }

  #registerUpdateOrganization() {
    this.registerTool({
      title: "update_organization",
      annotations: UPDATE_TOOL,
      description:
        "Updates an organization. The current version must be provided for optimistic locking.",
      inputSchema: z.strictObject({
        id: ApiSchema.Organizations.OrganizationSchema.shape.id,
        values: ApiSchema.Organizations.UpdateOrganizationRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.Organizations.UpdateOrganizationResponseSchema),
      fn: async ({ id, values }) => {
        const result = await DbOrganizations.create(this._args).update({ values, pKey: id });

        return this.mapResult(result, (organization) => ({
          organization: encodeOrganizationResponse(organization),
        }));
      },
    });
  }
}
