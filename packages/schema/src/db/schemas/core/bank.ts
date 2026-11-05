import { CoreSchema } from "./_schema";
import { primaryKey } from "../_common";
import { organizationIdReference } from "./organizations";
import { currencyCodeReference } from "./currencies";
import { accountIdReference } from "../ledger/accounts";
import * as pg from "drizzle-orm/pg-core";
import { auditFields } from "../_audit";
import { sql } from "drizzle-orm";
import { organizationPolicies } from "../_policies";

const ibanFormatCheck = (column: pg.AnyPgColumn) =>
  sql`${column} ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'`;

export const BankRelationsSchema = CoreSchema.table(
  "bank_relations",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    name: pg.text().notNull(),
    iban: pg.text().notNull(),
    // The IBAN printed on the invoices, when it differs from the IBAN of the account. For example, in
    // Switzerland and Liechtenstein, a QR-IBAN for QR-bills with a QR reference.
    invoiceIban: pg.text(),
    currency: currencyCodeReference(),
    accountId: accountIdReference(),
    ...auditFields(),
  },
  (table) => [
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "bank_relations",
    }),
    pg.uniqueIndex("bank_relations_org_iban_uidx").on(table.organizationId, table.iban),
    pg.check("bank_relations_iban_format", ibanFormatCheck(table.iban)),
    pg
      .uniqueIndex("bank_relations_org_invoice_iban_uidx")
      .on(table.organizationId, table.invoiceIban),
    pg.check("bank_relations_invoice_iban_format", ibanFormatCheck(table.invoiceIban)),
  ],
);

export const bankRelationIdReference = () => pg.uuid().references(() => BankRelationsSchema.id);
