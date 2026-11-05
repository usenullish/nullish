import { DbCollectionOrganizationMembers } from "@usenullish/nullish-engine/core";
import {
  ApiSchema,
  CommonSchema,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import { READ_ONLY_TOOL, McpTools, type McpToolsInitArgs } from "./_tools";

export class McpToolsOrganizationMembers extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsOrganizationMembers {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListOrganizationMembers();
  }

  override registerWriteTools() {}

  #registerListOrganizationMembers() {
    this.registerTool({
      title: "list_organization_members",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the members of an organization, i.e. the users who have access to it, with their name, email, image and role (admin, accountant or reviewer). Only the admins of the organization see its members: for anyone else the list is empty.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
      }),
      outputSchema: toJsonSchema(
        ApiSchema.OrganizationMembers.GetOrganizationMembersResponseSchema,
      ),
      fn: async ({ organizationId, query }) => {
        const result = await DbCollectionOrganizationMembers.create({
          ...this._args,
          foreignKeyId: organizationId,
        }).list(query);

        return this.mapResult(result, (members) => ({
          members: members.map(encodeAuditFieldsResponse),
        }));
      },
    });
  }
}
