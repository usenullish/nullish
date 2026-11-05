import { DbCollectionInvitations } from "@usenullish/nullish-engine/core";
import type { DbCollectionStore } from "@usenullish/nullish-engine";
import type { Records } from "@usenullish/nullish-schema/records";
import {
  ApiSchema,
  CommonSchema,
  encodeInvitationResponse,
} from "@usenullish/nullish-schema/server";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import { READ_ONLY_TOOL, McpTools, type McpToolsInitArgs } from "./_tools";

type Invitation = Records["Core"]["Invitations"]["Select"];

export class McpToolsInvitations extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsInvitations {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListInvitations();
  }

  override registerWriteTools() {}

  #registerListInvitations() {
    this.registerTool({
      title: "list_invitations",
      annotations: READ_ONLY_TOOL,
      description:
        "Returns the pending invitations of an organization: the email invited, the role given on joining (admin, accountant or reviewer) and when the invitation expires. Only the admins of the organization see its invitations: for anyone else the list is empty.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.Invitations.GetInvitationsResponseSchema),
      fn: async ({ organizationId, query }) => {
        const store: Pick<
          DbCollectionStore<Invitation, never, string>,
          "list"
        > = DbCollectionInvitations.create({
          ...this._args,
          foreignKeyId: organizationId,
        });

        const result = await store.list(query);

        return this.mapResult(result, (invitations) => ({
          invitations: invitations.map(encodeInvitationResponse),
        }));
      },
    });
  }
}
