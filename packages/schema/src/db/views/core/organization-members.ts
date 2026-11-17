import { and, eq, getColumns } from "drizzle-orm";
import { CoreSchema, MembershipsSchema } from "../../schemas";
import { UsersSchema } from "../../schemas/auth/users";
import { orgSubscriptionIsValid, userIsOrgAdmin } from "../../schemas/_policies";

export const OrganizationMembersView = CoreSchema.view("organization_members")
  .with({ securityBarrier: true })
  .as((qb) =>
    qb
      .select({
        ...getColumns(MembershipsSchema),
        name: UsersSchema.name,
        email: UsersSchema.email,
        image: UsersSchema.image,
      })
      .from(MembershipsSchema)
      .innerJoin(UsersSchema, eq(UsersSchema.id, MembershipsSchema.userId))
      .where(
        and(
          userIsOrgAdmin({ organizationId: MembershipsSchema.organizationId }),
          orgSubscriptionIsValid({ organizationId: MembershipsSchema.organizationId }),
        ),
      ),
  );
