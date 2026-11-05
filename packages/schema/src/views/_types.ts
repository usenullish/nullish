import type { ViewsSchema } from "./_schemas";
import type { z } from "zod";

interface Views {
  Core: {
    OrganizationMembers: {
      Select: z.infer<
        typeof ViewsSchema.Core.OrganizationMembersView.SelectOrganizationMembersView
      >;
    };
  };
  Ledger: {
    AccountBalances: {
      Select: z.infer<typeof ViewsSchema.Ledger.AccountBalancesView.SelectAccountBalancesView>;
    };
    BalanceSheet: {
      Select: z.infer<typeof ViewsSchema.Ledger.BalanceSheetView.SelectBalanceSheetView>;
    };
    IncomeStatement: {
      Select: z.infer<typeof ViewsSchema.Ledger.IncomeStatementView.SelectIncomeStatementView>;
    };
  };
}

export type { Views };
