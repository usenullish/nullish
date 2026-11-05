import * as z from "zod";
import { ReportsSchema } from "../../reports";

export const GetActiveAccountsResponseSchema = z.strictObject({
  accountIds: ReportsSchema.LedgerSchema.ActiveAccountIdsSchema,
});
