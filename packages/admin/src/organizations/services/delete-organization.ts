import { asc, isNotNull } from "drizzle-orm";
import { createSelectSchema } from "drizzle-orm/zod";
import type * as z from "zod";
import { type Option, type Result } from "@usenullish/nullish-common";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { selectMany } from "@usenullish/nullish-db";
import { deleteAuditLogs } from "../_helpers/audit-logs";
import { deleteOrganization } from "../_helpers/organizations";
import { AdminServiceContext, type AdminServiceContextArgs } from "../../_service";

// TODO: extract constants to make it more visible
// Similarly we can group the invitation 7 days constant
// and have the default expiration of the api-keys (?)
// Maybe a new pkg settings or config or in env
export const ORGANIZATION_DELETION_DELAY_DAYS = 30;

const organizations = DbSchema.Core.Organizations.OrganizationsSchema;

type Organization = Records["Core"]["Organizations"]["Select"];

const DeletedOrganizationSchema =
  RecordsSchema.Core.OrganizationsSchema.SelectOrganizationsSchema.pick({
    id: true,
    name: true,
  }).extend({
    deletedAt: createSelectSchema(organizations).shape.deletedAt.unwrap(),
  });

export type DeletedOrganization = z.infer<typeof DeletedOrganizationSchema>;

export class DeleteOrganizationService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): DeleteOrganizationService {
    return new this(args);
  }

  list(): Promise<Result<DeletedOrganization[]>> {
    return this._withDbContext((tx) =>
      selectMany({
        tx,
        table: organizations,
        schema: DeletedOrganizationSchema,
        selection: {
          id: organizations.id,
          name: organizations.name,
          deletedAt: organizations.deletedAt,
        },
        where: isNotNull(organizations.deletedAt),
        orderBy: [asc(organizations.deletedAt)],
      }),
    );
  }

  delete({
    organizationId,
  }: {
    organizationId: Organization["id"];
  }): Promise<Result<Option<Pick<Organization, "id">>>> {
    return this._withDbContext(async (tx) => {
      const organization = await deleteOrganization({ tx, organizationId });

      await deleteAuditLogs({ tx, organizationId });

      return organization;
    });
  }
}
