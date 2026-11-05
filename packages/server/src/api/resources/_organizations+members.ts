import { DbCollectionOrganizationMembers } from "@usenullish/nullish-engine/core";
import {
  ApiSchema,
  CommonSchema,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import type { Views } from "@usenullish/nullish-schema/views";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineListRoute } from "./_factories/crud-route-config";
import { _defineListHandler } from "../handlers/_list";

type OrganizationMember = Views["Core"]["OrganizationMembers"]["Select"];

const listRoute = defineListRoute({
  spec: { tag: "Members" },
  path: "/organizations/{parentId}/members",
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: { schema: ApiSchema.OrganizationMembers.GetOrganizationMembersResponseSchema },
    description:
      "Retrieve the members of an organization with their name, email and image. Only admins see them.",
  },
});

type ListRoute = typeof listRoute;

@ResourceProvider
export class OrganizationMembersHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [listRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): OrganizationMembersHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#list });
  }

  readonly #list = _defineListHandler<ListRoute, OrganizationMember>({
    query: async ({ db, userId, context, pagination, sort }) => {
      const parentId = context.req.param("parentId");

      if (isInvalidUuid(parentId)) {
        return { status: "error", err: new Error("Bad Request") };
      }

      return await DbCollectionOrganizationMembers.create({
        db,
        userId,
        foreignKeyId: parentId,
      }).list({ pagination, sort });
    },
    resourceKey: "members",
    build: ({ result: members }) => ({
      members: members.map(encodeAuditFieldsResponse),
    }),
  });
}
