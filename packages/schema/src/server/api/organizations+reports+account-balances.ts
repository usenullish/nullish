import * as z from "zod";
import { ViewsSchema } from "../../views";
import { withAccountBalancesCodecs } from "./_reports";

const AccountBalancesResponseSchema = withAccountBalancesCodecs(
  ViewsSchema.Ledger.AccountBalancesView.SelectAccountBalancesView,
);

export const GetAccountBalancesResponseSchema = z.strictObject({
  accountBalances: z.array(AccountBalancesResponseSchema),
});
