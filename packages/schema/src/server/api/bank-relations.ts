import { RecordsSchema } from "../../records";
import * as z from "zod";
import { PaginationResponseSchema } from "../common/query";
import { withAuditFieldsCodecs } from "./_audit";

export const BankRelationsResponseSchema = withAuditFieldsCodecs(
  RecordsSchema.Core.BankSchema.SelectBankRelationsSchema,
);

export const GetBankRelationsResponseSchema = z.strictObject({
  data: z.array(BankRelationsResponseSchema),
  pagination: PaginationResponseSchema.optional(),
});
export const GetBankRelationResponseSchema = z.strictObject({
  bankRelation: BankRelationsResponseSchema.nullish(),
});
export const CreateBankRelationResponseSchema = z.strictObject({
  bankRelation: BankRelationsResponseSchema,
});
export const UpdateBankRelationResponseSchema = CreateBankRelationResponseSchema;

export const GetBankRelationsRequestSchema =
  RecordsSchema.Core.BankSchema.SelectBankRelationsSchema;
export const CreateBankRelationRequestSchema =
  RecordsSchema.Core.BankSchema.InsertBankRelationsSchema;
export const UpdateBankRelationRequestSchema =
  RecordsSchema.Core.BankSchema.UpdateBankRelationsSchema;
