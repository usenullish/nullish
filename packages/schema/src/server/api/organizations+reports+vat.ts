import * as z from "zod";
import { BigIntCodec } from "@usenullish/nullish-common";
import { ReportsSchema } from "../../reports";

export const GenerateVatDeclarationRequestSchema = ReportsSchema.VatSchema.VatDeclarationArgsSchema;

const VatRateTaxItemResponseSchema = ReportsSchema.VatSchema.VatRateTaxItemSchema.extend({
  taxableBase: BigIntCodec,
  taxAmount: BigIntCodec,
});

const VatNetRateTaxItemResponseSchema = ReportsSchema.VatSchema.VatNetRateTaxItemSchema.extend({
  rate: BigIntCodec,
  taxableBase: BigIntCodec,
  taxAmount: BigIntCodec,
});

const VatSalesTaxItemResponseSchema = ReportsSchema.VatSchema.VatSalesTaxItemSchema.extend({
  rate: BigIntCodec,
  taxableBase: BigIntCodec,
  taxAmount: BigIntCodec,
});

export const GenerateVatDeclarationResponseSchema =
  ReportsSchema.VatSchema.VatDeclarationResultSchema.extend({
    box200: BigIntCodec,
    box220: BigIntCodec,
    box225: BigIntCodec,
    box235: BigIntCodec,
    box289: BigIntCodec,
    box299: BigIntCodec,
    box303: z.array(VatSalesTaxItemResponseSchema),
    box302: z.array(VatSalesTaxItemResponseSchema),
    box323: z.array(VatNetRateTaxItemResponseSchema),
    box322: z.array(VatNetRateTaxItemResponseSchema),
    box383: VatRateTaxItemResponseSchema,
    box382: VatRateTaxItemResponseSchema,
    box399: BigIntCodec,
    box400: BigIntCodec,
    box405: BigIntCodec,
    box415: BigIntCodec,
    box470: BigIntCodec,
    box471: BigIntCodec,
    box479: BigIntCodec,
    box500: BigIntCodec,
    box510: BigIntCodec,
    box910: BigIntCodec,
  });
