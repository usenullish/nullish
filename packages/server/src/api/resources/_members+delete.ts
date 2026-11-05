import { DeleteOrganizationMemberService } from "@usenullish/nullish-engine/core";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineDeleteRoute } from "./_factories/crud-route-config";
import { _defineDeleteHandler } from "../handlers/_delete";

type Membership = Records["Core"]["Memberships"]["Select"];

const deleteRoute = defineDeleteRoute({
  spec: { tag: "Members" },
  path: "/members",
  response: {
    description:
      "Remove a member from an organization, or leave it when the membership is your own. Only admins remove others. Also deletes the person's chat conversations in that organization. An organization keeps at least one admin.",
  },
});

type DeleteRoute = typeof deleteRoute;

@ResourceProvider
export class MembersDeleteHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: ["/members"], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): MembersDeleteHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: deleteRoute, handler: this.#delete });
  }

  readonly #delete = _defineDeleteHandler<DeleteRoute, Pick<Membership, "id">, Membership["id"]>({
    delete: async ({ db, userId, pKey: membershipId }) =>
      await DeleteOrganizationMemberService.create({ db, userId, membershipId }).delete(),
    pKeySchema: ApiSchema.OrganizationMembers.OrganizationMemberSchema.shape.id,
    resourceKey: "member",
  });
}
