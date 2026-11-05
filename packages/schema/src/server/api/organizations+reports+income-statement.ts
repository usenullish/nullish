import * as z from "zod";
import { ViewsSchema } from "../../views";
import { withAccountBalancesCodecs } from "./_reports";

const IncomeStatementResponseSchema = withAccountBalancesCodecs(
  ViewsSchema.Ledger.IncomeStatementView.SelectIncomeStatementView,
);

export const GetIncomeStatementResponseSchema = z.strictObject({
  incomeStatement: z.array(IncomeStatementResponseSchema),
});
