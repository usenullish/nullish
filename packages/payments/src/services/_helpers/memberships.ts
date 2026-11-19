import { and, eq } from "drizzle-orm";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";
import { selectMany, type Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const memberships = DbSchema.Core.Memberships.MembershipsSchema;

type Membership = Records["Core"]["Memberships"]["Select"];

export const getMembership = async ({
  tx,
  organizationId,
  userId,
}: {
  tx: Tx;
  organizationId: Membership["organizationId"];
  userId: Membership["userId"];
}): Promise<Membership> => {
  const rows = await selectMany({
    tx,
    table: memberships,
    schema: RecordsSchema.Core.MembershipsSchema.SelectMembershipsSchema,
    where: and(eq(memberships.organizationId, organizationId), eq(memberships.userId, userId)),
  });

  assertArrayExactlyOne(rows);

  const [membership] = rows;
  return membership;
};
