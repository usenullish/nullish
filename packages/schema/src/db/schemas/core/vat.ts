import { numeric, primaryKey } from "../_common";
import { organizationIdReference } from "./organizations";
import { auditFields } from "../_audit";
import * as pg from "drizzle-orm/pg-core";
import { organizationPolicies } from "../_policies";
import { sql } from "drizzle-orm";
import { CoreSchema } from "./_schema";
import {
  RATE_DECIMALS,
  VatPaymentMethod,
  VatPeriodStatus,
  VatRemunerationMethod,
  VatType,
} from "../../constants/vat";
import { date } from "../_temporal";
import { vatNumber, vatNumberChecks } from "../_vat";
import { periodIdReference } from "../ledger/periods";

// VAT in Switzerland simplified
// https://www.bexio.com/en-CH/mwst-vat

export const vatRemunerationMethod = CoreSchema.enum(
  "vat_remuneration_method",
  VatRemunerationMethod,
);

export const vatPaymentMethod = CoreSchema.enum("vat_payment_method", VatPaymentMethod);

export const VatSettingsSchema = CoreSchema.table(
  "vat_settings",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    vatNumber: vatNumber().notNull(),
    ...auditFields(),
  },
  (table) => [
    pg.uniqueIndex("vat_settings_org_uidx").on(table.organizationId),
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "vat_settings",
    }),
    ...vatNumberChecks({
      column: table.vatNumber,
      tableName: "vat_settings",
    }),
  ],
);

export const VatMethodsSchema = CoreSchema.table(
  "vat_methods",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    periodId: periodIdReference(),
    remunerationMethod: vatRemunerationMethod().notNull(),
    paymentMethod: vatPaymentMethod().notNull(),
    ...auditFields(),
  },
  (table) => [
    pg.uniqueIndex("vat_methods_period_uidx").on(table.periodId),
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "vat_methods",
    }),
  ],
);

export const vatType = CoreSchema.enum("vat_type", VatType);

export const VatRatesSchema = CoreSchema.table(
  "vat_rates",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    code: pg.text().notNull(),
    type: vatType().notNull(),
    rate: numeric({ precision: 6, scale: RATE_DECIMALS }).notNull(),
    netRate: numeric({ precision: 6, scale: RATE_DECIMALS }), // Taux de la dette fiscalle nette
    startOn: date().notNull(),
    endOn: date(),
    ...auditFields(),
  },
  (table) => [
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "vat_rates",
    }),
    // netRate is mandatory if type is net_rate_tax
    pg.check(
      "net_rate_required_for_net_rate_tax",
      sql`(${table.type} = 'net_rate_tax' AND ${table.netRate} IS NOT NULL) OR (${table.type} != 'net_rate_tax' AND ${table.netRate} IS NULL)`,
    ),
  ],
);

export const vatRateIdReference = () => pg.uuid().references(() => VatRatesSchema.id);

export const vatPeriodStatus = CoreSchema.enum("vat_period_status", VatPeriodStatus);

export const VatPeriodsSchema = CoreSchema.table(
  "vat_periods",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    startOn: date().notNull(),
    endOn: date().notNull(),
    status: vatPeriodStatus().notNull().default(VatPeriodStatus.OPEN),
    ...auditFields(),
  },
  (table) => [
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "vat_periods",
    }),
    pg.uniqueIndex("vat_periods_org_start_uidx").on(table.organizationId, table.startOn),
    pg.check("vat_periods_end_after_start", sql`${table.endOn} >= ${table.startOn}`),
  ],
);
