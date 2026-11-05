import { BillingSchema } from "./_schema";
import { primaryKey } from "../_common";
import { organizationIdReference } from "../core/organizations";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { auditFields } from "../_audit";
import { organizationPolicies } from "../_policies";
import { ClientType } from "../../constants/clients";
import { vatNumber, vatNumberChecks } from "../_vat";
import { addressFields } from "../_address";
import { communicationFields } from "../_communication";

export const clientType = BillingSchema.enum("client_type", ClientType);

export const ClientsSchema = BillingSchema.table(
  "clients",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    type: clientType().notNull().default(ClientType.COMPANY),
    name: pg.text().notNull(),
    ...addressFields(),
    ...communicationFields(),
    vatNumber: vatNumber(),
    ...auditFields(),
  },
  (table) => [
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "clients",
    }),
    ...vatNumberChecks({
      column: table.vatNumber,
      tableName: "clients",
    }),
    pg.check("clients_name_not_blank", sql`btrim(${table.name}) <> ''`),
  ],
);

export const clientIdReference = () =>
  pg
    .uuid()
    .references(() => ClientsSchema.id)
    .notNull();

const clientIdCascadeReference = () =>
  pg
    .uuid()
    .references(() => ClientsSchema.id, { onDelete: "cascade" })
    .notNull();

export const ContactsSchema = BillingSchema.table(
  "contacts",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    clientId: clientIdCascadeReference(),
    lastName: pg.text().notNull(),
    firstName: pg.text(),
    email: pg.text(),
    phone: pg.text(),
    ...auditFields(),
  },
  (table) => [
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "contacts",
    }),
  ],
);
