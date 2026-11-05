import * as pg from "drizzle-orm/pg-core";
import { MigrationSchema } from "./_schema";
import { primaryKey } from "../_common";
import { auditFields } from "../_audit";
import { authUserIdReferenceOptional } from "../auth/users";
import { organizationIdReference } from "../core/organizations";
import { organizationPolicies } from "../_policies";
import { MigrationProvider, MigrationStatus } from "../../constants/migrations";

export const migrationProvider = MigrationSchema.enum("migration_provider", MigrationProvider);
export const migrationStatus = MigrationSchema.enum("migration_status", MigrationStatus);

// With cascade, deleting a user would also delete every migration they started, and their datasets
// through the second cascade. But a migration belongs to the organization, not to the user.
// We save the user to know who initiated the migration because we do not keep track of it
// in audit.logs on purpose.
const onDelete = { onDelete: "set null" } as const;

export const MigrationsSchema = MigrationSchema.table(
  "migrations",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    userId: authUserIdReferenceOptional(onDelete),
    provider: migrationProvider().notNull(),
    status: migrationStatus().notNull().default(MigrationStatus.DRAFT),
    ...auditFields(),
  },
  (table) => [
    pg.index("migrations_organization_id_idx").on(table.organizationId),
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "migrations",
    }),
  ],
);

export const migrationIdReference = () =>
  pg
    .uuid()
    .references(() => MigrationsSchema.id, { onDelete: "cascade" })
    .notNull();
