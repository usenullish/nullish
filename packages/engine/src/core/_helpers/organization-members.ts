import type { Tx } from "@usenullish/nullish-db";
import { selectMany } from "@usenullish/nullish-db";
import { DbView } from "@usenullish/nullish-schema/db";
import { type Views, ViewsSchema } from "@usenullish/nullish-schema/views";
import { and, eq } from "drizzle-orm";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";

type OrganizationMember = Views["Core"]["OrganizationMembers"]["Select"];

export const getOrganizationMember = async ({
  tx,
  organizationId,
  userId,
}: {
  tx: Tx;
  organizationId: OrganizationMember["organizationId"];
  userId: OrganizationMember["userId"];
}): Promise<OrganizationMember> => {
  const view = DbView.Core.OrganizationMembers.OrganizationMembersView;

  const members = await selectMany({
    tx,
    table: view,
    schema: ViewsSchema.Core.OrganizationMembersView.SelectOrganizationMembersView,
    where: and(eq(view.organizationId, organizationId), eq(view.userId, userId)),
  });

  assertArrayExactlyOne(members);

  const [member] = members;
  return member;
};
