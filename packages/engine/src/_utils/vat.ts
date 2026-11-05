import { createTokenSchema } from "@usenullish/nullish-common";
import { RATE_DECIMALS } from "@usenullish/nullish-schema/db";

const RateSchema = createTokenSchema({ decimals: RATE_DECIMALS });

// A rate in percent parsed to an integer scaled with RATE_DECIMALS, e.g. 8.1 is 8100n.
export const parseRate = (rate: number): bigint => RateSchema.parse(`${rate}`);
