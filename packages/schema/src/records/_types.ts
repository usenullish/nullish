import type { RecordsSchema } from "./_schemas";
import type { z } from "zod";

interface Records {
  Auth: {
    Users: {
      Select: z.infer<typeof RecordsSchema.Auth.UsersSchema.SelectUsersSchema>;
    };
    Sessions: {
      Select: z.infer<typeof RecordsSchema.Auth.SessionsSchema.SelectSessionsSchema>;
    };
    ApiKeys: {
      Select: z.infer<typeof RecordsSchema.Auth.ApiKeysSchema.SelectApiKeysSchema>;
    };
  };
  Core: {
    Organizations: {
      Select: z.infer<typeof RecordsSchema.Core.OrganizationsSchema.SelectOrganizationsSchema>;
      Insert: z.infer<typeof RecordsSchema.Core.OrganizationsSchema.InsertOrganizationsSchema>;
      Update: z.infer<typeof RecordsSchema.Core.OrganizationsSchema.UpdateOrganizationsSchema>;
      Filter: z.infer<typeof RecordsSchema.Core.OrganizationsSchema.FilterOrganizationsSchema>;
    };
    Memberships: {
      Select: z.infer<typeof RecordsSchema.Core.MembershipsSchema.SelectMembershipsSchema>;
      Insert: z.infer<typeof RecordsSchema.Core.MembershipsSchema.InsertMembershipsSchema>;
      Update: z.infer<typeof RecordsSchema.Core.MembershipsSchema.UpdateMembershipsSchema>;
    };
    Invitations: {
      Select: z.infer<typeof RecordsSchema.Core.InvitationsSchema.SelectInvitationsSchema>;
      Insert: z.infer<typeof RecordsSchema.Core.InvitationsSchema.InsertInvitationsSchema>;
    };
    VatSettings: {
      Select: z.infer<typeof RecordsSchema.Core.VatSchema.SelectVatSettingsSchema>;
      Insert: z.infer<typeof RecordsSchema.Core.VatSchema.InsertVatSettingsSchema>;
      Update: z.infer<typeof RecordsSchema.Core.VatSchema.UpdateVatSettingsSchema>;
    };
    VatMethods: {
      Select: z.infer<typeof RecordsSchema.Core.VatSchema.SelectVatMethodsSchema>;
      Insert: z.infer<typeof RecordsSchema.Core.VatSchema.InsertVatMethodsSchema>;
      Update: z.infer<typeof RecordsSchema.Core.VatSchema.UpdateVatMethodsSchema>;
    };
    VatRates: {
      Select: z.infer<typeof RecordsSchema.Core.VatSchema.SelectVatRatesSchema>;
      Insert: z.infer<typeof RecordsSchema.Core.VatSchema.InsertVatRatesSchema>;
      Update: z.infer<typeof RecordsSchema.Core.VatSchema.UpdateVatRatesSchema>;
      Filter: z.infer<typeof RecordsSchema.Core.VatSchema.FilterVatRatesSchema>;
    };
    VatPeriods: {
      Select: z.infer<typeof RecordsSchema.Core.VatSchema.SelectVatPeriodsSchema>;
      Insert: z.infer<typeof RecordsSchema.Core.VatSchema.InsertVatPeriodsSchema>;
      Update: z.infer<typeof RecordsSchema.Core.VatSchema.UpdateVatPeriodsSchema>;
      Filter: z.infer<typeof RecordsSchema.Core.VatSchema.FilterVatPeriodsSchema>;
    };
    Currencies: {
      Select: z.infer<typeof RecordsSchema.Core.CurrenciesSchema.SelectCurrenciesSchema>;
      Insert: z.infer<typeof RecordsSchema.Core.CurrenciesSchema.InsertCurrenciesSchema>;
    };
    AccountingSettings: {
      Select: z.infer<typeof RecordsSchema.Core.AccountingSchema.SelectAccountingSettingsSchema>;
      Insert: z.infer<typeof RecordsSchema.Core.AccountingSchema.InsertAccountingSettingsSchema>;
      Update: z.infer<typeof RecordsSchema.Core.AccountingSchema.UpdateAccountingSettingsSchema>;
    };
    BillingSettings: {
      Select: z.infer<typeof RecordsSchema.Core.BillingSchema.SelectBillingSettingsSchema>;
      Insert: z.infer<typeof RecordsSchema.Core.BillingSchema.InsertBillingSettingsSchema>;
      Update: z.infer<typeof RecordsSchema.Core.BillingSchema.UpdateBillingSettingsSchema>;
    };
    DocumentTemplates: {
      Select: z.infer<typeof RecordsSchema.Core.DocumentsSchema.SelectDocumentTemplatesSchema>;
      Insert: z.infer<typeof RecordsSchema.Core.DocumentsSchema.InsertDocumentTemplatesSchema>;
      Update: z.infer<typeof RecordsSchema.Core.DocumentsSchema.UpdateDocumentTemplatesSchema>;
      Filter: z.infer<typeof RecordsSchema.Core.DocumentsSchema.FilterDocumentTemplatesSchema>;
    };
    TemplateContents: {
      Select: z.infer<typeof RecordsSchema.Core.DocumentsSchema.SelectTemplateContentsSchema>;
      Insert: z.infer<typeof RecordsSchema.Core.DocumentsSchema.InsertTemplateContentsSchema>;
      Update: z.infer<typeof RecordsSchema.Core.DocumentsSchema.UpdateTemplateContentsSchema>;
      Filter: z.infer<typeof RecordsSchema.Core.DocumentsSchema.FilterTemplateContentsSchema>;
    };
    BankRelations: {
      Select: z.infer<typeof RecordsSchema.Core.BankSchema.SelectBankRelationsSchema>;
      Insert: z.infer<typeof RecordsSchema.Core.BankSchema.InsertBankRelationsSchema>;
      Update: z.infer<typeof RecordsSchema.Core.BankSchema.UpdateBankRelationsSchema>;
    };
  };
  Ledger: {
    Periods: {
      Select: z.infer<typeof RecordsSchema.Ledger.PeriodsSchema.SelectPeriodsSchema>;
      Insert: z.infer<typeof RecordsSchema.Ledger.PeriodsSchema.InsertPeriodsSchema>;
      Update: z.infer<typeof RecordsSchema.Ledger.PeriodsSchema.UpdatePeriodsSchema>;
      Filter: z.infer<typeof RecordsSchema.Ledger.PeriodsSchema.FilterPeriodsSchema>;
    };
    Accounts: {
      Select: z.infer<typeof RecordsSchema.Ledger.AccountsSchema.SelectAccountsSchema>;
      Insert: z.infer<typeof RecordsSchema.Ledger.AccountsSchema.InsertAccountsSchema>;
      Update: z.infer<typeof RecordsSchema.Ledger.AccountsSchema.UpdateAccountsSchema>;
      Filter: z.infer<typeof RecordsSchema.Ledger.AccountsSchema.FilterAccountsSchema>;
    };
    SystemAccounts: {
      Select: z.infer<typeof RecordsSchema.Ledger.SystemAccountsSchema.SelectSystemAccountsSchema>;
      Insert: z.infer<typeof RecordsSchema.Ledger.SystemAccountsSchema.InsertSystemAccountsSchema>;
      Update: z.infer<typeof RecordsSchema.Ledger.SystemAccountsSchema.UpdateSystemAccountsSchema>;
      Filter: z.infer<typeof RecordsSchema.Ledger.SystemAccountsSchema.FilterSystemAccountsSchema>;
    };
    JournalEntries: {
      Select: z.infer<typeof RecordsSchema.Ledger.JournalEntriesSchema.SelectJournalEntriesSchema>;
      Insert: z.infer<typeof RecordsSchema.Ledger.JournalEntriesSchema.InsertJournalEntriesSchema>;
      Update: z.infer<typeof RecordsSchema.Ledger.JournalEntriesSchema.UpdateJournalEntriesSchema>;
    };
    Postings: {
      Select: z.infer<typeof RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema>;
      Insert: z.infer<typeof RecordsSchema.Ledger.PostingsSchema.InsertPostingsSchema>;
      Update: z.infer<typeof RecordsSchema.Ledger.PostingsSchema.UpdatePostingsSchema>;
    };
    PeriodJournal: {
      Select: z.infer<
        typeof RecordsSchema.Ledger.PeriodJournalSchema.SelectPeriodJournalEntriesSchema
      >;
      Insert: z.infer<
        typeof RecordsSchema.Ledger.PeriodJournalSchema.InsertPeriodJournalEntriesSchema
      >;
    };
    PostingManualVatPostings: {
      Select: z.infer<
        typeof RecordsSchema.Ledger.PostingManualVatPostingsSchema.SelectPostingManualVatPostingsSchema
      >;
      Insert: z.infer<
        typeof RecordsSchema.Ledger.PostingManualVatPostingsSchema.InsertPostingManualVatPostingsSchema
      >;
    };
  };
  Billing: {
    Clients: {
      Select: z.infer<typeof RecordsSchema.Billing.ClientsSchema.SelectClientsSchema>;
      Insert: z.infer<typeof RecordsSchema.Billing.ClientsSchema.InsertClientsSchema>;
      Update: z.infer<typeof RecordsSchema.Billing.ClientsSchema.UpdateClientsSchema>;
      Filter: z.infer<typeof RecordsSchema.Billing.ClientsSchema.FilterClientsSchema>;
    };
    Contacts: {
      Select: z.infer<typeof RecordsSchema.Billing.ClientsSchema.SelectContactsSchema>;
      Insert: z.infer<typeof RecordsSchema.Billing.ClientsSchema.InsertContactsSchema>;
      Update: z.infer<typeof RecordsSchema.Billing.ClientsSchema.UpdateContactsSchema>;
      Filter: z.infer<typeof RecordsSchema.Billing.ClientsSchema.FilterContactsSchema>;
    };
    Invoices: {
      Select: z.infer<typeof RecordsSchema.Billing.InvoicesSchema.SelectInvoicesSchema>;
      Insert: z.infer<typeof RecordsSchema.Billing.InvoicesSchema.InsertInvoicesSchema>;
      Update: z.infer<typeof RecordsSchema.Billing.InvoicesSchema.UpdateInvoicesSchema>;
      Filter: z.infer<typeof RecordsSchema.Billing.InvoicesSchema.FilterInvoicesSchema>;
    };
    Lines: {
      Select: z.infer<typeof RecordsSchema.Billing.InvoicesSchema.SelectLinesSchema>;
      Insert: z.infer<typeof RecordsSchema.Billing.InvoicesSchema.InsertLinesSchema>;
      Filter: z.infer<typeof RecordsSchema.Billing.InvoicesSchema.FilterLinesSchema>;
    };
    InvoiceJournal: {
      Select: z.infer<
        typeof RecordsSchema.Billing.InvoiceJournalSchema.SelectInvoiceJournalEntriesSchema
      >;
      Insert: z.infer<
        typeof RecordsSchema.Billing.InvoiceJournalSchema.InsertInvoiceJournalEntriesSchema
      >;
    };
  };
  Banking: {
    Statements: {
      Select: z.infer<typeof RecordsSchema.Banking.StatementsSchema.SelectStatementsSchema>;
      Insert: z.infer<typeof RecordsSchema.Banking.StatementsSchema.InsertStatementsSchema>;
    };
    Movements: {
      Select: z.infer<typeof RecordsSchema.Banking.MovementsSchema.SelectMovementsSchema>;
      Insert: z.infer<typeof RecordsSchema.Banking.MovementsSchema.InsertMovementsSchema>;
      Update: z.infer<typeof RecordsSchema.Banking.MovementsSchema.UpdateMovementsSchema>;
      Filter: z.infer<typeof RecordsSchema.Banking.MovementsSchema.FilterMovementsSchema>;
    };
    MovementJournal: {
      Select: z.infer<
        typeof RecordsSchema.Banking.MovementJournalSchema.SelectMovementJournalEntriesSchema
      >;
      Insert: z.infer<
        typeof RecordsSchema.Banking.MovementJournalSchema.InsertMovementJournalEntriesSchema
      >;
    };
  };
  Chat: {
    Conversations: {
      Select: z.infer<typeof RecordsSchema.Chat.ConversationsSchema.SelectConversationsSchema>;
      Insert: z.infer<typeof RecordsSchema.Chat.ConversationsSchema.InsertConversationsSchema>;
      Update: z.infer<typeof RecordsSchema.Chat.ConversationsSchema.UpdateConversationsSchema>;
    };
    Messages: {
      Select: z.infer<typeof RecordsSchema.Chat.MessagesSchema.SelectMessagesSchema>;
      Insert: z.infer<typeof RecordsSchema.Chat.MessagesSchema.InsertMessagesSchema>;
      Filter: z.infer<typeof RecordsSchema.Chat.MessagesSchema.FilterMessagesSchema>;
    };
  };
  Migration: {
    Migrations: {
      Select: z.infer<typeof RecordsSchema.Migration.MigrationsSchema.SelectMigrationsSchema>;
      Insert: z.infer<typeof RecordsSchema.Migration.MigrationsSchema.InsertMigrationsSchema>;
      Update: z.infer<typeof RecordsSchema.Migration.MigrationsSchema.UpdateMigrationsSchema>;
    };
    Datasets: {
      Select: z.infer<typeof RecordsSchema.Migration.DatasetsSchema.SelectDatasetsSchema>;
      Insert: z.infer<typeof RecordsSchema.Migration.DatasetsSchema.InsertDatasetsSchema>;
      Update: z.infer<typeof RecordsSchema.Migration.DatasetsSchema.UpdateDatasetsSchema>;
    };
  };
  Metering: {
    LlmUsages: {
      Select: z.infer<typeof RecordsSchema.Metering.LlmUsagesSchema.SelectLlmUsagesSchema>;
      Insert: z.infer<typeof RecordsSchema.Metering.LlmUsagesSchema.InsertLlmUsagesSchema>;
    };
    LlmReservations: {
      Select: z.infer<
        typeof RecordsSchema.Metering.LlmReservationsSchema.SelectLlmReservationsSchema
      >;
      Insert: z.infer<
        typeof RecordsSchema.Metering.LlmReservationsSchema.InsertLlmReservationsSchema
      >;
    };
  };
}

export type { Records };
