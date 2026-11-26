import * as z from "zod";
import { BigIntCodec, DateCodec } from "@usenullish/nullish-common";
import { RecordsSchema } from "../../records";
import { SelectOrganizationsSchema } from "../../records/schemas/core/organizations";
import { withAuditFieldsCodecs } from "../../server/api/_audit";
import { JobPayloadSchema } from "./common";
import { createScheduledJobStateSchema } from "../_builders";

export const ExportPayloadSchema = z.strictObject({
  ...JobPayloadSchema.shape,
  organizationId: SelectOrganizationsSchema.shape.id,
});

export const ExportResultSchema = z.strictObject({
  exportId: z.uuid(),
});

export const ExportJobStateSchema = createScheduledJobStateSchema({
  schema: ExportResultSchema,
});

export const ExportPeriodJournalEntriesSchema = withAuditFieldsCodecs(
  RecordsSchema.Ledger.PeriodJournalSchema.SelectPeriodJournalEntriesSchema,
);

export const ExportPostingManualVatPostingsSchema = withAuditFieldsCodecs(
  RecordsSchema.Ledger.PostingManualVatPostingsSchema.SelectPostingManualVatPostingsSchema,
);

export const ExportInvoiceJournalEntriesSchema = withAuditFieldsCodecs(
  RecordsSchema.Billing.InvoiceJournalSchema.SelectInvoiceJournalEntriesSchema,
);

export const ExportStatementsSchema = withAuditFieldsCodecs(
  RecordsSchema.Banking.StatementsSchema.SelectStatementsSchema,
).extend({
  startOn: DateCodec,
  endOn: DateCodec,
  openingBalance: BigIntCodec,
  closingBalance: BigIntCodec,
});

export const ExportMovementJournalEntriesSchema = withAuditFieldsCodecs(
  RecordsSchema.Banking.MovementJournalSchema.SelectMovementJournalEntriesSchema,
);
