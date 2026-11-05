import { eq } from "drizzle-orm";
import { assertArrayAtMostOne, type Option } from "@usenullish/nullish-common";
import { deleteMany, type Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const organizations = DbSchema.Core.Organizations.OrganizationsSchema;

type Organization = Records["Core"]["Organizations"]["Select"];

export const deleteOrganization = async ({
  tx,
  organizationId,
}: {
  tx: Tx;
  organizationId: Organization["id"];
}): Promise<Option<Pick<Organization, "id">>> => {
  const rows = await deleteMany({
    tx,
    table: organizations,
    returningSchema: RecordsSchema.Core.OrganizationsSchema.SelectOrganizationsSchema.pick({
      id: true,
    }),
    where: eq(organizations.id, organizationId),
  });

  assertArrayAtMostOne(rows);

  const [row] = rows;
  return row;
};
