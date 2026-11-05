import { AuditSchema } from "./_schema";
import { primaryKey } from "../_common";
import * as pg from "drizzle-orm/pg-core";
import { timestampNow } from "../_temporal";

export const operationType = AuditSchema.enum("log_operation_type", ["insert", "update", "delete"]);

// We do not use foreign keys for organization_id and user_id on purpose. When an organization
// is deleted, the cascade writes the logs of its records once the organization row is already
// gone, so a foreign key would make the deletion fail. Likewise, we do not want the logs to
// prevent a user from being deleted.
export const LogsSchema = AuditSchema.table(
  "logs",
  {
    id: primaryKey(),
    tableSchema: pg.text().notNull(),
    tableName: pg.text().notNull(),
    recordId: pg.uuid().notNull(),
    organizationId: pg.uuid().notNull(),
    operation: operationType().notNull(),
    oldData: pg.jsonb(),
    newData: pg.jsonb(),
    userId: pg.text(),
    loggedAt: timestampNow(),
  },
  (table) => [pg.index("logs_organization_id_idx").on(table.organizationId)],
);
