import {
  BigIntCodec,
  DateCodec,
  nonNullish,
  TimestampCodec,
  encodeWithCodecs,
} from "@usenullish/nullish-common";
import type { Records } from "../records";
import type { Composites } from "../composites";
import type { Reports } from "../reports";

export const encodeAuditFieldsResponse = <T extends { updatedAt: Date; createdAt: Date }>(
  value: T,
) => ({
  ...value,
  createdAt: encodeWithCodecs({ schema: TimestampCodec, value: value.createdAt }),
  updatedAt: encodeWithCodecs({ schema: TimestampCodec, value: value.updatedAt }),
});

export const encodeInvitationResponse = <
  T extends { updatedAt: Date; createdAt: Date; expiresAt: Date },
>(
  invitation: T,
) => ({
  ...encodeAuditFieldsResponse(invitation),
  expiresAt: encodeWithCodecs({ schema: TimestampCodec, value: invitation.expiresAt }),
});

export const encodeOrganizationResponse = (
  organization: Records["Core"]["Organizations"]["Select"],
) => ({
  ...encodeAuditFieldsResponse(organization),
  deletedAt: nonNullish(organization.deletedAt)
    ? encodeWithCodecs({ schema: TimestampCodec, value: organization.deletedAt })
    : null,
});

export const encodeBankMovementResponse = ({
  dedupeHash: _dedupeHash,
  ...movement
}: Records["Banking"]["Movements"]["Select"]) => ({
  ...encodeAuditFieldsResponse(movement),
  bookedOn: encodeWithCodecs({ schema: DateCodec, value: movement.bookedOn }),
  valueOn: nonNullish(movement.valueOn)
    ? encodeWithCodecs({ schema: DateCodec, value: movement.valueOn })
    : null,
  amount: encodeWithCodecs({ schema: BigIntCodec, value: movement.amount }),
  foreignAmount: nonNullish(movement.foreignAmount)
    ? encodeWithCodecs({ schema: BigIntCodec, value: movement.foreignAmount })
    : null,
  bankFeesAmount: nonNullish(movement.bankFeesAmount)
    ? encodeWithCodecs({ schema: BigIntCodec, value: movement.bankFeesAmount })
    : null,
});

export const encodeBankRelationSummaryResponse = ({
  bankRelation,
  movements,
  balance,
}: Composites["BankRelationSummaries"]["Select"]) => ({
  bankRelation: encodeAuditFieldsResponse(bankRelation),
  movements,
  balance: nonNullish(balance)
    ? {
        amount: encodeWithCodecs({ schema: BigIntCodec, value: balance.amount }),
        on: encodeWithCodecs({ schema: DateCodec, value: balance.on }),
      }
    : null,
});

export const encodeVatMethodSummaryResponse = ({
  vatMethod,
  period,
}: Composites["VatMethodSummaries"]["Select"]) => ({
  vatMethod: encodeAuditFieldsResponse(vatMethod),
  period: {
    ...encodeAuditFieldsResponse(period),
    startOn: encodeWithCodecs({ schema: DateCodec, value: period.startOn }),
    endOn: encodeWithCodecs({ schema: DateCodec, value: period.endOn }),
  },
});

export const encodeDatasetSummaryResponse = ({
  dataset,
  migration,
}: Composites["DatasetSummaries"]["Select"]) => ({
  dataset: encodeAuditFieldsResponse(dataset),
  migration: encodeAuditFieldsResponse(migration),
});

export const encodeJournalResponse = ({ entry, postings }: Composites["Journal"]["Select"]) => ({
  entry: {
    ...encodeAuditFieldsResponse(entry),
    validOn: encodeWithCodecs({ schema: DateCodec, value: entry.validOn }),
  },
  postings: postings.map((posting) => ({
    ...encodeAuditFieldsResponse(posting),
    debit: encodeWithCodecs({ schema: BigIntCodec, value: posting.debit }),
    credit: encodeWithCodecs({ schema: BigIntCodec, value: posting.credit }),
  })),
});

export const encodeInvoiceResponse = (invoice: Records["Billing"]["Invoices"]["Select"]) => ({
  ...encodeAuditFieldsResponse(invoice),
  issueOn: encodeWithCodecs({ schema: DateCodec, value: invoice.issueOn }),
  dueOn: nonNullish(invoice.dueOn)
    ? encodeWithCodecs({ schema: DateCodec, value: invoice.dueOn })
    : null,
});

export const encodeInvoiceSummaryResponse = ({
  invoice,
  amounts,
}: Composites["InvoiceSummaries"]["Select"]) => ({
  invoice: encodeInvoiceResponse(invoice),
  amounts: {
    totals: {
      subtotal: encodeWithCodecs({ schema: BigIntCodec, value: amounts.totals.subtotal }),
      vat: encodeWithCodecs({ schema: BigIntCodec, value: amounts.totals.vat }),
      total: encodeWithCodecs({ schema: BigIntCodec, value: amounts.totals.total }),
    },
    balance: {
      paid: encodeWithCodecs({ schema: BigIntCodec, value: amounts.balance.paid }),
      remaining: encodeWithCodecs({ schema: BigIntCodec, value: amounts.balance.remaining }),
    },
  },
});

export const encodeBankMovementSummaryResponse = ({
  movement,
  suggestedInvoice,
}: Composites["MovementSummaries"]["Select"]) => ({
  movement: encodeBankMovementResponse(movement),
  suggestedInvoice: nonNullish(suggestedInvoice)
    ? encodeInvoiceSummaryResponse(suggestedInvoice)
    : null,
});

export const encodeJournalSummaryResponse = ({
  entry,
  postings,
  invoiceJournal,
  periodJournal,
  movementJournal,
  vatPostings,
}: Composites["JournalSummaries"]["Select"]) => ({
  entry: {
    ...encodeAuditFieldsResponse(entry),
    validOn: encodeWithCodecs({ schema: DateCodec, value: entry.validOn }),
  },
  postings: postings.map((posting) => ({
    ...encodeAuditFieldsResponse(posting),
    debit: encodeWithCodecs({ schema: BigIntCodec, value: posting.debit }),
    credit: encodeWithCodecs({ schema: BigIntCodec, value: posting.credit }),
  })),
  invoiceJournal,
  periodJournal,
  movementJournal,
  vatPostings,
});

export const encodeAccountLedgerPostingResponse = (
  posting: Reports["Ledger"]["AccountLedger"]["Result"][number],
) => ({
  ...posting,
  validOn: encodeWithCodecs({ schema: DateCodec, value: posting.validOn }),
  debit: encodeWithCodecs({ schema: BigIntCodec, value: posting.debit }),
  credit: encodeWithCodecs({ schema: BigIntCodec, value: posting.credit }),
  baseDebit: encodeWithCodecs({ schema: BigIntCodec, value: posting.baseDebit }),
  baseCredit: encodeWithCodecs({ schema: BigIntCodec, value: posting.baseCredit }),
  balance: encodeWithCodecs({ schema: BigIntCodec, value: posting.balance }),
});

export const encodeAccountLedgerResponse = ({
  postings,
  totals,
}: Reports["Ledger"]["AccountLedger"]["Report"]) => ({
  postings: postings.map(encodeAccountLedgerPostingResponse),
  totals: {
    baseDebit: encodeWithCodecs({ schema: BigIntCodec, value: totals.baseDebit }),
    baseCredit: encodeWithCodecs({ schema: BigIntCodec, value: totals.baseCredit }),
    balance: nonNullish(totals.balance)
      ? encodeWithCodecs({ schema: BigIntCodec, value: totals.balance })
      : null,
  },
});
