import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { auditFields } from "../_audit";
import { CoreSchema } from "./_schema";
import { primaryKey } from "../_common";
import { legalForm } from "./legal";
import { addressFields } from "../_address";
import { communicationFields } from "../_communication";
import { timestamp } from "../_temporal";
import { coreOrganizationPolicies } from "../_policies";

export const OrganizationsSchema = CoreSchema.table(
  "organizations",
  {
    id: primaryKey(),
    name: pg.text().notNull(),
    legalForm: legalForm().notNull(),
    ...addressFields(),
    ...communicationFields(),
    deletedAt: timestamp(),
    ...auditFields(),
  },
  (table) => [
    ...coreOrganizationPolicies({
      organizationId: table.id,
      deletedAt: table.deletedAt,
      tableName: "organizations",
    }),
    pg.check("organizations_name_not_blank", sql`btrim(${table.name}) <> ''`),
  ],
);

export const organizationIdReferenceOptional = ({
  onDelete,
}: {
  onDelete?: "cascade" | "set null";
} = {}) => pg.uuid().references(() => OrganizationsSchema.id, { onDelete });

export const organizationIdReference = () =>
  organizationIdReferenceOptional({ onDelete: "cascade" }).notNull();
