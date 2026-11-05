import * as z from "zod";
import { NotEmptyStringSchema } from "./string";

export const BigIntSchema = z.strictObject({ __bigint__: NotEmptyStringSchema });

export const BigIntCodec = z.codec(BigIntSchema, z.bigint(), {
  decode: ({ __bigint__ }) => BigInt(__bigint__),
  encode: (value) => ({ __bigint__: value.toString() }),
});
