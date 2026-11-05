import * as z from "zod";
import { ViewsSchema } from "../../views";
import { withAccountBalancesCodecs } from "./_reports";

const BalanceSheetResponseSchema = withAccountBalancesCodecs(
  ViewsSchema.Ledger.BalanceSheetView.SelectBalanceSheetView,
);

export const GetBalanceSheetResponseSchema = z.strictObject({
  balanceSheet: z.array(BalanceSheetResponseSchema),
});
