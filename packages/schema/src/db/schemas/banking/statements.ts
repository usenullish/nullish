import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { BankingSchema } from "./_schema";
import { primaryKey } from "../_common";
import { auditFields } from "../_audit";
import { organizationIdReference } from "../core/organizations";
import { bankRelationIdReference } from "../core/bank";
import { currencyCodeReference } from "../core/currencies";
import { currencyValue } from "../_currency";
import { date } from "../_temporal";
import { organizationPolicies } from "../_policies";

export const StatementsSchema = BankingSchema.table(
  "statements",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    // The bank relation whose IBAN is BkToCstmrStmt/Stmt/Acct/Id/IBAN.
    bankRelationId: bankRelationIdReference().notNull(),
    // BkToCstmrStmt/GrpHdr/MsgId
    bankMessageId: pg.text().notNull(),
    // BkToCstmrStmt/Stmt/Id
    bankStatementId: pg.text().notNull(),
    // BkToCstmrStmt/Stmt/FrToDt/FrDtTm
    startOn: date().notNull(),
    // BkToCstmrStmt/Stmt/FrToDt/ToDtTm
    endOn: date().notNull(),
    // BkToCstmrStmt/Stmt/Bal/Amt of the balance whose Tp/CdOrPrtry/Cd is OPBD, negative when its
    // CdtDbtInd is DBIT.
    openingBalance: currencyValue().notNull(),
    // BkToCstmrStmt/Stmt/Bal/Amt of the balance whose Tp/CdOrPrtry/Cd is CLBD, negative when its
    // CdtDbtInd is DBIT.
    closingBalance: currencyValue().notNull(),
    // BkToCstmrStmt/Stmt/Acct/Ccy
    currency: currencyCodeReference(),
    ...auditFields(),
  },
  (table) => [
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "statements",
    }),
    pg
      .uniqueIndex("statements_bank_relation_bank_statement_uidx")
      .on(table.bankRelationId, table.bankStatementId),
    pg.check("statements_period", sql`${table.startOn} <= ${table.endOn}`),
  ],
);

export const statementIdReference = () =>
  pg
    .uuid()
    .references(() => StatementsSchema.id)
    .notNull();
