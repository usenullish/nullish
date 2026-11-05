import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { MigrationSchema } from "./_schema";
import { primaryKey } from "../_common";
import { auditFields } from "../_audit";
import { organizationIdReference } from "../core/organizations";
import { organizationPolicies } from "../_policies";
import { migrationIdReference } from "./migrations";
import { MigrationDatasetType } from "../../constants/migrations";

export const migrationDatasetType = MigrationSchema.enum(
  "migration_dataset_type",
  MigrationDatasetType,
);

export const DatasetsSchema = MigrationSchema.table(
  "datasets",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    migrationId: migrationIdReference(),
    type: migrationDatasetType().notNull(),
    name: pg.text().notNull(),
    // Data are stored as json because they are written once and read as a whole by the job,
    // which validates them again with their schemas.
    data: pg.jsonb().notNull(),
    ...auditFields(),
  },
  (table) => [
    pg.index("datasets_migration_id_idx").on(table.migrationId),
    // One dataset per type and migration, except the journal which can span several datasets
    pg
      .uniqueIndex("datasets_migration_type_uidx")
      .on(table.migrationId, table.type)
      .where(sql`${table.type} <> ${MigrationDatasetType.JOURNAL}`),
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "datasets",
    }),
  ],
);
