import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { RecordsSchema } from "@usenullish/nullish-schema/records";
import { eq } from "drizzle-orm";
import * as z from "zod";

const UserWithOrgSchema = z.strictObject({
  userId: RecordsSchema.Auth.UsersSchema.SelectUsersSchema.shape.id,
  name: RecordsSchema.Auth.UsersSchema.SelectUsersSchema.shape.name,
  email: RecordsSchema.Auth.UsersSchema.SelectUsersSchema.shape.email,
  organizationId:
    RecordsSchema.Core.OrganizationsSchema.SelectOrganizationsSchema.shape.id.nullable(),
  organizationName:
    RecordsSchema.Core.OrganizationsSchema.SelectOrganizationsSchema.shape.name.nullable(),
  role: RecordsSchema.Core.MembershipsSchema.SelectMembershipsSchema.shape.role.nullable(),
});

const UsersWithOrgsSchema = z.array(UserWithOrgSchema);

export type UserWithOrg = z.infer<typeof UserWithOrgSchema>;
type UsersWithOrgs = z.infer<typeof UsersWithOrgsSchema>;

export const listUsersWithOrgs = async (tx: Tx): Promise<Result<UsersWithOrgs>> => {
  return tryCatch(async () => {
    const rows = await tx
      .select({
        userId: DbSchema.Auth.Users.UsersSchema.id,
        name: DbSchema.Auth.Users.UsersSchema.name,
        email: DbSchema.Auth.Users.UsersSchema.email,
        organizationId: DbSchema.Core.Organizations.OrganizationsSchema.id,
        organizationName: DbSchema.Core.Organizations.OrganizationsSchema.name,
        role: DbSchema.Core.Memberships.MembershipsSchema.role,
      })
      .from(DbSchema.Auth.Users.UsersSchema)
      .leftJoin(
        DbSchema.Core.Memberships.MembershipsSchema,
        eq(DbSchema.Core.Memberships.MembershipsSchema.userId, DbSchema.Auth.Users.UsersSchema.id),
      )
      .leftJoin(
        DbSchema.Core.Organizations.OrganizationsSchema,
        eq(
          DbSchema.Core.Memberships.MembershipsSchema.organizationId,
          DbSchema.Core.Organizations.OrganizationsSchema.id,
        ),
      );

    return UsersWithOrgsSchema.parse(rows);
  });
};
