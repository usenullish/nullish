import { and, eq } from "drizzle-orm";
import { selectMany, type Tx } from "@usenullish/nullish-db";
import { assertArrayAtMostOne, type Option } from "@usenullish/nullish-common";
import { DbView } from "@usenullish/nullish-schema/db";
import { type Views, ViewsSchema } from "@usenullish/nullish-schema/views";

type OrganizationMember = Views["Core"]["OrganizationMembers"]["Select"];

export const getOrganizationMember = async ({
  tx,
  organizationId,
  userId,
}: Pick<OrganizationMember, "organizationId" | "userId"> & { tx: Tx }): Promise<
  Option<OrganizationMember>
> => {
  const view = DbView.Core.OrganizationMembers.OrganizationMembersView;

  const members = await selectMany({
    tx,
    table: view,
    schema: ViewsSchema.Core.OrganizationMembersView.SelectOrganizationMembersView,
    where: and(eq(view.organizationId, organizationId), eq(view.userId, userId)),
  });

  assertArrayAtMostOne(members);

  const [member] = members;
  return member;
};
