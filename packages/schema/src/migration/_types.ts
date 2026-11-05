import type { MigrationSchema } from "./_schemas";
import type { z } from "zod";

interface Migration {
  Foreign: {
    Account: z.infer<typeof MigrationSchema.Foreign.ForeignAccountSchema>;
    Accounts: z.infer<typeof MigrationSchema.Foreign.ForeignAccountsSchema>;
    Balances: z.infer<typeof MigrationSchema.Foreign.ForeignBalancesSchema>;
    OpeningBalances: z.infer<typeof MigrationSchema.Foreign.ForeignOpeningBalancesSchema>;
    JournalLine: z.infer<typeof MigrationSchema.Foreign.ForeignJournalLineSchema>;
    JournalEntry: z.infer<typeof MigrationSchema.Foreign.ForeignJournalEntrySchema>;
    Journal: z.infer<typeof MigrationSchema.Foreign.ForeignJournalSchema>;
    Client: z.infer<typeof MigrationSchema.Foreign.ForeignClientSchema>;
    Clients: z.infer<typeof MigrationSchema.Foreign.ForeignClientsSchema>;
    ClientContact: z.infer<typeof MigrationSchema.Foreign.ForeignContactSchema>;
    Invoice: z.infer<typeof MigrationSchema.Foreign.ForeignInvoiceSchema>;
    Invoices: z.infer<typeof MigrationSchema.Foreign.ForeignInvoicesSchema>;
  };
  ForeignEncoded: {
    Accounts: z.input<typeof MigrationSchema.Foreign.ForeignAccountsSchema>;
    Balances: z.input<typeof MigrationSchema.Foreign.ForeignBalancesSchema>;
    OpeningBalances: z.input<typeof MigrationSchema.Foreign.ForeignOpeningBalancesSchema>;
    Journal: z.input<typeof MigrationSchema.Foreign.ForeignJournalSchema>;
    Clients: z.input<typeof MigrationSchema.Foreign.ForeignClientsSchema>;
    Invoices: z.input<typeof MigrationSchema.Foreign.ForeignInvoicesSchema>;
  };
}

export type { Migration };
