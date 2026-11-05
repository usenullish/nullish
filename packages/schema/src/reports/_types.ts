import type { ReportsSchema } from "./_schemas";
import type { z } from "zod";

interface Reports {
  Ledger: {
    Args: z.infer<typeof ReportsSchema.LedgerSchema.LedgerReportArgsSchema>;
    AccountBalances: {
      Result: z.infer<typeof ReportsSchema.LedgerSchema.AccountBalancesSchema>;
    };
    BalanceSheet: {
      Result: z.infer<typeof ReportsSchema.LedgerSchema.BalanceSheetSchema>;
    };
    IncomeStatement: {
      Result: z.infer<typeof ReportsSchema.LedgerSchema.IncomeStatementSchema>;
    };
    AccountLedger: {
      Args: z.infer<typeof ReportsSchema.LedgerSchema.AccountLedgerArgsSchema>;
      Result: z.infer<typeof ReportsSchema.LedgerSchema.AccountLedgerSchema>;
      Totals: z.infer<typeof ReportsSchema.LedgerSchema.AccountLedgerTotalsSchema>;
      Report: z.infer<typeof ReportsSchema.LedgerSchema.AccountLedgerReportSchema>;
      SortField: z.infer<typeof ReportsSchema.LedgerSchema.AccountLedgerSortFieldSchema>;
      Filter: z.infer<typeof ReportsSchema.LedgerSchema.FilterAccountLedgerSchema>;
    };
    ActiveAccountIds: {
      Result: z.infer<typeof ReportsSchema.LedgerSchema.ActiveAccountIdsSchema>;
    };
  };
  Vat: {
    Declaration: {
      Args: z.infer<typeof ReportsSchema.VatSchema.VatDeclarationArgsSchema>;
      Result: z.infer<typeof ReportsSchema.VatSchema.VatDeclarationResultSchema>;
    };
  };
  Metering: {
    LlmUsage: {
      Args: z.infer<typeof ReportsSchema.MeteringSchema.LlmUsageArgsSchema>;
      Result: z.infer<typeof ReportsSchema.MeteringSchema.LlmUsageResultSchema>;
    };
  };
}

export type { Reports };
