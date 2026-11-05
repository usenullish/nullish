import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { BankingSchema } from "./_schema";
import { primaryKey } from "../_common";
import { auditFields } from "../_audit";
import { organizationIdReference } from "../core/organizations";
import { bankRelationIdReference } from "../core/bank";
import { currencyCodeReference, currencyCodeReferenceOptional } from "../core/currencies";
import { currencyValue } from "../_currency";
import { date } from "../_temporal";
import { checkHashFormat, hash } from "../_hash";
import { organizationPolicies } from "../_policies";
import { statementIdReference } from "./statements";
import { BankMovementStatus } from "../../constants/bank-movements";

export const movementStatus = BankingSchema.enum("movement_status", BankMovementStatus);

export const MovementsSchema = BankingSchema.table(
  "movements",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    bankRelationId: bankRelationIdReference().notNull(),
    statementId: statementIdReference(),
    // The bank's own reference ("Account servicer") for the movement, when the bank gives one:
    // Stmt/Ntry/NtryDtls/TxDtls/Refs/AcctSvcrRef, else Stmt/Ntry/AcctSvcrRef.
    bankReference: pg.text(),
    // Recognizes a movement already imported, e.g. from an overlapping statement, as some movements
    // carry no bank reference: the SHA-256 of the parsed movement and of its occurrence among the
    // identical movements of its statement.
    dedupeHash: hash().notNull(),
    // Stmt/Ntry/BookgDt/Dt
    bookedOn: date().notNull(),
    // Stmt/Ntry/ValDt/Dt
    valueOn: date(),
    // Positive means money came into the account, negative means it left.
    // Stmt/Ntry/NtryDtls/TxDtls/Amt, else Stmt/Ntry/Amt, negative when the CdtDbtInd next to it is DBIT.
    amount: currencyValue().notNull(),
    // The Ccy attribute of the amount.
    currency: currencyCodeReference(),
    // Stmt/Ntry/NtryDtls/TxDtls/RltdPties/Dbtr/Pty/Nm when money came in,
    // Stmt/Ntry/NtryDtls/TxDtls/RltdPties/Cdtr/Pty/Nm when it left.
    counterpartyName: pg.text(),
    // The PstlAdr of the same party, its AdrLine or its StrtNm, BldgNb, PstCd, TwnNm and Ctry, joined
    // with ", ".
    counterpartyAddress: pg.text(),
    // Stmt/Ntry/NtryDtls/TxDtls/RltdPties/DbtrAcct/Id/IBAN when money came in,
    // Stmt/Ntry/NtryDtls/TxDtls/RltdPties/CdtrAcct/Id/IBAN when it left.
    counterpartyIban: pg.text(),
    // The QR reference or the creditor reference (RF…) sent by the payer:
    // Stmt/Ntry/NtryDtls/TxDtls/RmtInf/Strd/CdtrRefInf/Ref
    creditorReference: pg.text(),
    // The free text ("remittance information") sent by the payer: Stmt/Ntry/NtryDtls/TxDtls/RmtInf/Ustrd
    communication: pg.text(),
    // The bank's own description of the movement:
    // Stmt/Ntry/NtryDtls/TxDtls/AddtlTxInf, else Stmt/Ntry/AddtlNtryInf
    description: pg.text(),
    // The amount in another currency than the account's, from the first
    // of InstdAmt, TxAmt or CntrValAmt in Stmt/Ntry/NtryDtls/TxDtls/AmtDtls
    // (else Stmt/Ntry/AmtDtls) whose currency differs, empty when its currency is unknown.
    foreignAmount: currencyValue(),
    foreignCurrency: currencyCodeReferenceOptional(),
    // The fees of the banks: Stmt/Ntry/NtryDtls/TxDtls/Chrgs (else Stmt/Ntry/Chrgs), its total or its
    // only amount, empty when it gives several amounts without a total or the currency is unknown.
    bankFeesAmount: currencyValue(),
    bankFeesCurrency: currencyCodeReferenceOptional(),
    status: movementStatus().notNull().default(BankMovementStatus.UNRECONCILED),
    ...auditFields(),
  },
  (table) => [
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "movements",
    }),
    pg
      .uniqueIndex("movements_bank_relation_dedupe_hash_uidx")
      .on(table.bankRelationId, table.dedupeHash),
    pg.index("movements_bank_relation_status_idx").on(table.bankRelationId, table.status),
    pg.index("movements_bank_relation_booked_on_idx").on(table.bankRelationId, table.bookedOn),
    pg.check("movements_amount_not_zero", sql`${table.amount} <> 0`),
    checkHashFormat({ name: "movements_dedupe_hash_format", column: table.dedupeHash }),
  ],
);

export const movementIdReference = () =>
  pg
    .uuid()
    .references(() => MovementsSchema.id)
    .notNull();
