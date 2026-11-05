import { BigIntCodec, TimestampCodec } from "@usenullish/nullish-common";
import * as z from "zod";

export const withAccountBalancesCodecs = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({
    totalDebit: BigIntCodec,
    totalCredit: BigIntCodec,
    balance: BigIntCodec,
    computedAt: TimestampCodec,
  });
