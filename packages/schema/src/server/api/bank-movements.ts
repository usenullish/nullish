import { RecordsSchema } from "../../records";
import * as z from "zod";
import { withAuditFieldsCodecs } from "./_audit";
import { BigIntCodec, DateCodec, DateStringCodec } from "@usenullish/nullish-common";

export const BankMovementSchema = withAuditFieldsCodecs(
  RecordsSchema.Banking.MovementsSchema.SelectMovementsSchema.omit({ dedupeHash: true }),
).extend({
  bookedOn: DateCodec,
  valueOn: DateCodec.nullable(),
  amount: BigIntCodec.describe(
    "Amount in the smallest unit of the currency. Positive means money came into the bank relation, negative means it left.",
  ),
  foreignAmount: BigIntCodec.nullable().describe(
    "For information only: the amount in another currency, e.g. what the payer sent, in the smallest unit of foreignCurrency. Signed like amount.",
  ),
  bankFeesAmount: BigIntCodec.nullable().describe(
    "For information only: the fees of the banks, in the smallest unit of bankFeesCurrency.",
  ),
});

export const GetBankMovementsResponseSchema = z.strictObject({
  bankMovements: z.array(BankMovementSchema),
});
export const GetBankMovementResponseSchema = z.strictObject({
  bankMovement: BankMovementSchema.nullish(),
});

export const GetBankMovementsFiltersSchema =
  RecordsSchema.Banking.MovementsSchema.FilterMovementsSchema.extend({
    bookedOnFrom: DateCodec.optional(),
    bookedOnTo: DateCodec.optional(),
  });
export const GetBankMovementsFiltersQuerySchema =
  RecordsSchema.Banking.MovementsSchema.FilterMovementsSchema.extend({
    bookedOnFrom: DateStringCodec.optional(),
    bookedOnTo: DateStringCodec.optional(),
  });
