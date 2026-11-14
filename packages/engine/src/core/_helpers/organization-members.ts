import { and, eq } from "drizzle-orm";
import { DbUserContext, selectMany, type Tx } from "@usenullish/nullish-db";
import {
  assertArrayAtMostOne,
  type Option,
  type Result,
  tryCatch,
} from "@usenullish/nullish-common";
import { DbView } from "@usenullish/nullish-schema/db";
import { type Views, ViewsSchema } from "@usenullish/nullish-schema/views";
import type { DbStoreInitArgs } from "../../store";

type OrganizationMember = Views["Core"]["OrganizationMembers"]["Select"];

const view = DbView.Core.OrganizationMembers.OrganizationMembersView;

export const getOrganizationMember = async ({
  tx,
  organizationId,
  userId,
}: Pick<OrganizationMember, "organizationId" | "userId"> & { tx: Tx }): Promise<
  Option<OrganizationMember>
> => {
  const members = await selectMany({
    tx,
    table: view,
    schema:
      ViewsSchema.Core.OrganizationMembersView.SelectOrganizationMembersView,
    where: and(
      eq(view.organizationId, organizationId),
      eq(view.userId, userId),
    ),
  });

  assertArrayAtMostOne(members);

  const [member] = members;
  return member;
};
