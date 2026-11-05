import type { Tx } from "@usenullish/nullish-db";
import { selectMany, updateMany } from "@usenullish/nullish-db";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { eq } from "drizzle-orm";
import type { LockStrength } from "drizzle-orm/pg-core";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";

type SelectOrganization = Records["Core"]["Organizations"]["Select"];
type UpdateOrganization = Records["Core"]["Organizations"]["Update"];

export const getOrganization = async ({
  tx,
  id,
  lock,
}: {
  tx: Tx;
  id: SelectOrganization["id"];
  lock?: LockStrength;
}): Promise<SelectOrganization> => {
  const organizations = await selectMany({
    tx,
    table: DbSchema.Core.Organizations.OrganizationsSchema,
    schema: RecordsSchema.Core.OrganizationsSchema.SelectOrganizationsSchema,
    where: eq(DbSchema.Core.Organizations.OrganizationsSchema.id, id),
    lock,
  });

  assertArrayExactlyOne(organizations);

  const [organization] = organizations;
  return organization;
};

export const updateOrganization = async ({
  tx,
  id,
  values,
}: {
  tx: Tx;
  id: SelectOrganization["id"];
  values: Partial<UpdateOrganization & Pick<SelectOrganization, "deletedAt">>;
}): Promise<SelectOrganization> => {
  const organizations = await updateMany<SelectOrganization, Db["Core"]["Organizations"]>({
    tx,
    table: DbSchema.Core.Organizations.OrganizationsSchema,
    values,
    returningSchema: RecordsSchema.Core.OrganizationsSchema.SelectOrganizationsSchema,
    where: eq(DbSchema.Core.Organizations.OrganizationsSchema.id, id),
  });

  assertArrayExactlyOne(organizations);

  const [organization] = organizations;
  return organization;
};
