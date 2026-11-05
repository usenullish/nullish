import type { DbSchema } from "./_schemas";
import type { DbView } from "./_views";

interface Db {
  Auth: {
    Users: typeof DbSchema.Auth.Auth.users;
  };
  Core: {
    Organizations: typeof DbSchema.Core.Organizations.OrganizationsSchema;
    Memberships: typeof DbSchema.Core.Memberships.MembershipsSchema;
    Invitations: typeof DbSchema.Core.Invitations.InvitationsSchema;
    VatSettings: typeof DbSchema.Core.Vat.VatSettingsSchema;
    VatMethods: typeof DbSchema.Core.Vat.VatMethodsSchema;
    VatRates: typeof DbSchema.Core.Vat.VatRatesSchema;
    VatPeriods: typeof DbSchema.Core.Vat.VatPeriodsSchema;
    Currencies: typeof DbSchema.Core.Currencies.CurrenciesSchema;
    AccountingSettings: typeof DbSchema.Core.Accounting.AccountingSettingsSchema;
    BankRelations: typeof DbSchema.Core.Bank.BankRelationsSchema;
    BillingSettings: typeof DbSchema.Core.Billing.BillingSettingsSchema;
    DocumentTemplates: typeof DbSchema.Core.Documents.DocumentTemplatesSchema;
    TemplateContents: typeof DbSchema.Core.Documents.TemplateContentsSchema;
    OrganizationMembers: typeof DbView.Core.OrganizationMembers.OrganizationMembersView;
  };
  Ledger: {
    Periods: typeof DbSchema.Ledger.Periods.PeriodsSchema;
    Accounts: typeof DbSchema.Ledger.Accounts.AccountsSchema;
    SystemAccounts: typeof DbSchema.Ledger.SystemAccounts.SystemAccountsSchema;
    PeriodJournal: typeof DbSchema.Ledger.PeriodJournal.PeriodJournalEntriesSchema;
    AccountBalances: typeof DbView.Ledger.AccountBalances.AccountBalancesView;
    BalanceSheet: typeof DbView.Ledger.BalanceSheet.BalanceSheetView;
    IncomeStatement: typeof DbView.Ledger.IncomeStatement.IncomeStatementView;
  };
  Billing: {
    Clients: typeof DbSchema.Billing.Clients.ClientsSchema;
    Contacts: typeof DbSchema.Billing.Clients.ContactsSchema;
    Invoices: typeof DbSchema.Billing.Invoices.InvoicesSchema;
    Lines: typeof DbSchema.Billing.Invoices.LinesSchema;
    InvoiceJournal: typeof DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema;
  };
  Banking: {
    Statements: typeof DbSchema.Banking.Statements.StatementsSchema;
    Movements: typeof DbSchema.Banking.Movements.MovementsSchema;
    MovementJournal: typeof DbSchema.Banking.MovementJournal.MovementJournalEntriesSchema;
  };
  Metering: {
    LlmUsages: typeof DbSchema.Metering.LlmUsages.LlmUsagesSchema;
    LlmReservations: typeof DbSchema.Metering.LlmReservations.LlmReservationsSchema;
  };
  Chat: {
    Conversations: typeof DbSchema.Chat.Conversations.ConversationsSchema;
    Messages: typeof DbSchema.Chat.Messages.MessagesSchema;
  };
  Migration: {
    Migrations: typeof DbSchema.Migration.Migrations.MigrationsSchema;
    Datasets: typeof DbSchema.Migration.Datasets.DatasetsSchema;
  };
}

export type { Db };
