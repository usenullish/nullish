import { BillingSchema } from "./_schema";
import { numeric, primaryKey } from "../_common";
import { organizationIdReference } from "../core/organizations";
import * as pg from "drizzle-orm/pg-core";
import { auditFields } from "../_audit";
import { organizationPolicies } from "../_policies";
import { clientIdReference } from "./clients";
import { currencyValue } from "../_currency";
import { monetaryFields } from "../_monetary";
import { InvoiceLineType, InvoiceStatus, QUANTITY_DECIMALS } from "../../constants/invoices";
import { sql } from "drizzle-orm";
import { date } from "../_temporal";

export const invoiceStatus = BillingSchema.enum("invoice_status", InvoiceStatus);

export const InvoicesSchema = BillingSchema.table(
  "invoices",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    clientId: clientIdReference(),
    status: invoiceStatus().notNull().default(InvoiceStatus.DRAFT),
    number: pg.integer(),
    paymentReference: pg.text(),
    issueOn: date().notNull(),
    dueOn: date(),
    ...monetaryFields(),
    ...auditFields(),
  },
  (table) => [
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "invoices",
    }),
    pg.uniqueIndex("invoices_client_number_uidx").on(table.clientId, table.number),
    pg.check(
      "invoices_number_unless_draft",
      sql`(${table.status} = 'draft') = (${table.number} IS NULL)`,
    ),
    pg
      .uniqueIndex("invoices_organization_payment_reference_uidx")
      .on(table.organizationId, table.paymentReference),
    pg.check(
      "invoices_payment_reference_unless_draft",
      sql`(${table.status} = 'draft') = (${table.paymentReference} IS NULL)`,
    ),
    pg.check("invoices_payment_reference_format", sql`${table.paymentReference} ~ '^[0-9]{20}$'`),
  ],
);

export const invoiceIdReference = () => pg.uuid().references(() => InvoicesSchema.id);

export const invoiceIdCascadeReference = () =>
  pg
    .uuid()
    .references(() => InvoicesSchema.id, { onDelete: "cascade" })
    .notNull();

export const lineType = BillingSchema.enum("line_type", InvoiceLineType);

export const LinesSchema = BillingSchema.table(
  "lines",
  {
    id: primaryKey(),
    // We denormalize the organization_id in child tables such as "lines"
    // to improve the deletion process, notably the cleanup of the audit table,
    // which is also indexed by the same field. Furthermore, it improves RLS performance,
    // // as no join on the parent table is required to assert permissions.
    organizationId: organizationIdReference(),
    invoiceId: invoiceIdCascadeReference(),
    type: lineType().notNull(),
    description: pg.text().notNull(),
    quantity: numeric({ precision: 10, scale: QUANTITY_DECIMALS }).notNull(),
    unitPrice: currencyValue().notNull(),
    ...auditFields(),
  },
  (table) => [
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "lines",
    }),
    pg.check("lines_quantity_non_negative", sql`${table.quantity} >= 0`),
    pg.check("lines_unit_price_non_negative", sql`${table.unitPrice} >= 0`),
  ],
);
