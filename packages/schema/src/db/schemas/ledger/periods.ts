import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { auditFields } from "../_audit";
import { organizationIdReference } from "../core/organizations";
import { LedgerSchema } from "./_schema";
import { primaryKey } from "../_common";
import { organizationPolicies } from "../_policies";
import { date } from "../_temporal";
import { PeriodStatus } from "../../constants/periods";

export const periodStatus = LedgerSchema.enum("period_status", PeriodStatus);

export const PeriodsSchema = LedgerSchema.table(
  "periods",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    startOn: date().notNull(),
    endOn: date().notNull(),
    status: periodStatus().notNull().default(PeriodStatus.OPEN),
    ...auditFields(),
  },
  (table) => [
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "periods",
    }),
    pg.uniqueIndex("periods_org_start_uq").on(table.organizationId, table.startOn),
    pg.check("periods_end_after_start", sql`${table.endOn} >= ${table.startOn}`),
  ],
);

export const periodIdReference = () =>
  pg
    .uuid()
    .references(() => PeriodsSchema.id)
    .notNull();
