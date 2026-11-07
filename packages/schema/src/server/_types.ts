import type { ApiSchema, CommonSchema } from "./_schemas";
import * as z from "zod";

interface Api {
  Periods: {
    Server: {
      GetPeriodsRequest: z.input<typeof ApiSchema.Periods.GetPeriodsRequestSchema>;
      GetPeriodsResponse: z.input<typeof ApiSchema.Periods.GetPeriodsResponseSchema>;
      GetPeriodResponse: z.input<typeof ApiSchema.Periods.GetPeriodResponseSchema>;
      CreatePeriodRequest: typeof ApiSchema.Periods.CreatePeriodRequestSchema;
      CreatePeriodResponse: z.input<typeof ApiSchema.Periods.CreatePeriodResponseSchema>;
      UpdatePeriodRequest: typeof ApiSchema.Periods.UpdatePeriodRequestSchema;
      UpdatePeriodResponse: z.input<typeof ApiSchema.Periods.UpdatePeriodResponseSchema>;
    };
    Client: {
      GetPeriodsFilters: z.infer<typeof ApiSchema.Periods.GetPeriodsFiltersQuerySchema>;
      Period: z.infer<typeof ApiSchema.Periods.PeriodsResponseSchema>;
      GetPeriodsResponse: z.infer<typeof ApiSchema.Periods.GetPeriodsResponseSchema>;
      GetPeriodResponse: z.infer<typeof ApiSchema.Periods.GetPeriodResponseSchema>;
      CreatePeriodBody: z.infer<typeof ApiSchema.Periods.CreatePeriodRequestSchema>;
      CreatePeriodResponse: z.infer<typeof ApiSchema.Periods.CreatePeriodResponseSchema>;
      UpdatePeriodBody: z.infer<typeof ApiSchema.Periods.UpdatePeriodRequestSchema>;
      UpdatePeriodResponse: z.infer<typeof ApiSchema.Periods.UpdatePeriodResponseSchema>;
      ClosePeriodBody: z.infer<typeof ApiSchema.PeriodsClose.ClosePeriodRequestSchema>;
      ClosePeriodResponse: z.infer<typeof ApiSchema.PeriodsClose.ClosePeriodResponseSchema>;
    };
  };
  Organizations: {
    Server: {
      GetOrganizationsRequest: z.input<
        typeof ApiSchema.Organizations.GetOrganizationsRequestSchema
      >;
      GetOrganizationsResponse: z.input<
        typeof ApiSchema.Organizations.GetOrganizationsResponseSchema
      >;
      GetOrganizationResponse: z.input<
        typeof ApiSchema.Organizations.GetOrganizationResponseSchema
      >;
      CreateOrganizationRequest: typeof ApiSchema.Organizations.CreateOrganizationRequestSchema;
      CreateOrganizationResponse: z.input<
        typeof ApiSchema.Organizations.CreateOrganizationResponseSchema
      >;
      UpdateOrganizationRequest: typeof ApiSchema.Organizations.UpdateOrganizationRequestSchema;
      UpdateOrganizationResponse: z.input<
        typeof ApiSchema.Organizations.UpdateOrganizationResponseSchema
      >;
    };
    Client: {
      GetOrganizationsFilters: z.infer<
        typeof ApiSchema.Organizations.GetOrganizationsFiltersQuerySchema
      >;
      Organization: z.infer<typeof ApiSchema.Organizations.OrganizationSchema>;
      GetOrganizationsResponse: z.infer<
        typeof ApiSchema.Organizations.GetOrganizationsResponseSchema
      >;
      GetOrganizationResponse: z.infer<
        typeof ApiSchema.Organizations.GetOrganizationResponseSchema
      >;
      CreateOrganizationBody: z.infer<
        typeof ApiSchema.Organizations.CreateOrganizationRequestSchema
      >;
      CreateOrganizationResponse: z.infer<
        typeof ApiSchema.Organizations.CreateOrganizationResponseSchema
      >;
      UpdateOrganizationBody: z.infer<
        typeof ApiSchema.Organizations.UpdateOrganizationRequestSchema
      >;
      UpdateOrganizationResponse: z.infer<
        typeof ApiSchema.Organizations.UpdateOrganizationResponseSchema
      >;
      DeleteOrganizationResponse: z.infer<
        typeof ApiSchema.OrganizationsDelete.DeleteOrganizationResponseSchema
      >;
    };
  };
  LedgerReports: {
    Client: {
      GetLedgerReportQuery: z.infer<typeof ApiSchema.LedgerReports.GetLedgerReportQuerySchema>;
    };
  };
  AccountBalances: {
    Client: {
      GetAccountBalancesResponse: z.infer<
        typeof ApiSchema.AccountBalances.GetAccountBalancesResponseSchema
      >;
    };
  };
  BalanceSheet: {
    Client: {
      GetBalanceSheetResponse: z.infer<typeof ApiSchema.BalanceSheet.GetBalanceSheetResponseSchema>;
    };
  };
  AccountLedger: {
    Client: {
      GetAccountLedgerQuery: z.infer<typeof ApiSchema.AccountLedger.GetAccountLedgerQuerySchema>;
      GetAccountLedgerFilters: z.infer<
        typeof ApiSchema.AccountLedger.GetAccountLedgerFiltersQuerySchema
      >;
      AccountLedgerPosting: z.infer<
        typeof ApiSchema.AccountLedger.AccountLedgerPostingResponseSchema
      >;
      GetAccountLedgerResponse: z.infer<
        typeof ApiSchema.AccountLedger.GetAccountLedgerResponseSchema
      >;
    };
  };
  ActiveAccounts: {
    Client: {
      GetActiveAccountsResponse: z.infer<
        typeof ApiSchema.ActiveAccounts.GetActiveAccountsResponseSchema
      >;
    };
  };
  IncomeStatement: {
    Client: {
      GetIncomeStatementResponse: z.infer<
        typeof ApiSchema.IncomeStatement.GetIncomeStatementResponseSchema
      >;
    };
  };
  VatReports: {
    Client: {
      GenerateVatDeclarationRequest: z.infer<
        typeof ApiSchema.VatReports.GenerateVatDeclarationRequestSchema
      >;
      GenerateVatDeclarationResponse: z.infer<
        typeof ApiSchema.VatReports.GenerateVatDeclarationResponseSchema
      >;
    };
  };
  VatSettings: {
    Server: {
      GetVatSettingsRequest: z.input<typeof ApiSchema.VatSettings.GetVatSettingsRequestSchema>;
      GetVatSettingsResponse: z.input<typeof ApiSchema.VatSettings.GetVatSettingsResponseSchema>;
      GetVatSettingResponse: z.input<typeof ApiSchema.VatSettings.GetVatSettingResponseSchema>;
      CreateVatSettingRequest: typeof ApiSchema.VatSettings.CreateVatSettingRequestSchema;
      CreateVatSettingResponse: z.input<
        typeof ApiSchema.VatSettings.CreateVatSettingResponseSchema
      >;
      UpdateVatSettingRequest: typeof ApiSchema.VatSettings.UpdateVatSettingRequestSchema;
      UpdateVatSettingResponse: z.input<
        typeof ApiSchema.VatSettings.UpdateVatSettingResponseSchema
      >;
    };
    Client: {
      VatSetting: z.infer<typeof ApiSchema.VatSettings.VatSettingsResponseSchema>;
      GetVatSettingsResponse: z.infer<typeof ApiSchema.VatSettings.GetVatSettingsResponseSchema>;
      GetVatSettingResponse: z.infer<typeof ApiSchema.VatSettings.GetVatSettingResponseSchema>;
      CreateVatSettingBody: z.infer<typeof ApiSchema.VatSettings.CreateVatSettingRequestSchema>;
      CreateVatSettingResponse: z.infer<
        typeof ApiSchema.VatSettings.CreateVatSettingResponseSchema
      >;
      UpdateVatSettingBody: z.infer<typeof ApiSchema.VatSettings.UpdateVatSettingRequestSchema>;
      UpdateVatSettingResponse: z.infer<
        typeof ApiSchema.VatSettings.UpdateVatSettingResponseSchema
      >;
    };
  };
  VatMethods: {
    Server: {
      GetVatMethodsRequest: z.input<typeof ApiSchema.VatMethods.GetVatMethodsRequestSchema>;
      GetVatMethodsResponse: z.input<typeof ApiSchema.VatMethods.GetVatMethodsResponseSchema>;
      GetVatMethodResponse: z.input<typeof ApiSchema.VatMethods.GetVatMethodResponseSchema>;
      CreateVatMethodRequest: typeof ApiSchema.VatMethods.CreateVatMethodRequestSchema;
      CreateVatMethodResponse: z.input<typeof ApiSchema.VatMethods.CreateVatMethodResponseSchema>;
      UpdateVatMethodRequest: typeof ApiSchema.VatMethods.UpdateVatMethodRequestSchema;
      UpdateVatMethodResponse: z.input<typeof ApiSchema.VatMethods.UpdateVatMethodResponseSchema>;
    };
    Client: {
      VatMethod: z.infer<typeof ApiSchema.VatMethods.VatMethodsResponseSchema>;
      GetVatMethodsResponse: z.infer<typeof ApiSchema.VatMethods.GetVatMethodsResponseSchema>;
      GetVatMethodResponse: z.infer<typeof ApiSchema.VatMethods.GetVatMethodResponseSchema>;
      CreateVatMethodBody: z.infer<typeof ApiSchema.VatMethods.CreateVatMethodRequestSchema>;
      CreateVatMethodResponse: z.infer<typeof ApiSchema.VatMethods.CreateVatMethodResponseSchema>;
      UpdateVatMethodBody: z.infer<typeof ApiSchema.VatMethods.UpdateVatMethodRequestSchema>;
      UpdateVatMethodResponse: z.infer<typeof ApiSchema.VatMethods.UpdateVatMethodResponseSchema>;
    };
  };
  VatRates: {
    Server: {
      GetVatRatesRequest: z.input<typeof ApiSchema.VatRates.GetVatRatesRequestSchema>;
      GetVatRatesResponse: z.input<typeof ApiSchema.VatRates.GetVatRatesResponseSchema>;
      GetVatRateResponse: z.input<typeof ApiSchema.VatRates.GetVatRateResponseSchema>;
      CreateVatRateRequest: typeof ApiSchema.VatRates.CreateVatRateRequestSchema;
      CreateVatRateResponse: z.input<typeof ApiSchema.VatRates.CreateVatRateResponseSchema>;
      UpdateVatRateRequest: typeof ApiSchema.VatRates.UpdateVatRateRequestSchema;
      UpdateVatRateResponse: z.input<typeof ApiSchema.VatRates.UpdateVatRateResponseSchema>;
    };
    Client: {
      GetVatRatesFilters: z.infer<typeof ApiSchema.VatRates.GetVatRatesFiltersQuerySchema>;
      VatRate: z.infer<typeof ApiSchema.VatRates.VatRatesResponseSchema>;
      GetVatRatesResponse: z.infer<typeof ApiSchema.VatRates.GetVatRatesResponseSchema>;
      GetVatRateResponse: z.infer<typeof ApiSchema.VatRates.GetVatRateResponseSchema>;
      CreateVatRateBody: z.infer<typeof ApiSchema.VatRates.CreateVatRateRequestSchema>;
      CreateVatRateResponse: z.infer<typeof ApiSchema.VatRates.CreateVatRateResponseSchema>;
      UpdateVatRateBody: z.infer<typeof ApiSchema.VatRates.UpdateVatRateRequestSchema>;
      UpdateVatRateResponse: z.infer<typeof ApiSchema.VatRates.UpdateVatRateResponseSchema>;
    };
  };
  VatPeriods: {
    Server: {
      GetVatPeriodsRequest: z.input<typeof ApiSchema.VatPeriods.GetVatPeriodsRequestSchema>;
      GetVatPeriodsResponse: z.input<typeof ApiSchema.VatPeriods.GetVatPeriodsResponseSchema>;
      GetVatPeriodResponse: z.input<typeof ApiSchema.VatPeriods.GetVatPeriodResponseSchema>;
      CreateVatPeriodRequest: typeof ApiSchema.VatPeriods.CreateVatPeriodRequestSchema;
      CreateVatPeriodResponse: z.input<typeof ApiSchema.VatPeriods.CreateVatPeriodResponseSchema>;
      UpdateVatPeriodRequest: typeof ApiSchema.VatPeriods.UpdateVatPeriodRequestSchema;
      UpdateVatPeriodResponse: z.input<typeof ApiSchema.VatPeriods.UpdateVatPeriodResponseSchema>;
    };
    Client: {
      GetVatPeriodsFilters: z.infer<typeof ApiSchema.VatPeriods.GetVatPeriodsFiltersQuerySchema>;
      VatPeriod: z.infer<typeof ApiSchema.VatPeriods.VatPeriodsResponseSchema>;
      GetVatPeriodsResponse: z.infer<typeof ApiSchema.VatPeriods.GetVatPeriodsResponseSchema>;
      GetVatPeriodResponse: z.infer<typeof ApiSchema.VatPeriods.GetVatPeriodResponseSchema>;
      CreateVatPeriodBody: z.infer<typeof ApiSchema.VatPeriods.CreateVatPeriodRequestSchema>;
      CreateVatPeriodResponse: z.infer<typeof ApiSchema.VatPeriods.CreateVatPeriodResponseSchema>;
      UpdateVatPeriodBody: z.infer<typeof ApiSchema.VatPeriods.UpdateVatPeriodRequestSchema>;
      UpdateVatPeriodResponse: z.infer<typeof ApiSchema.VatPeriods.UpdateVatPeriodResponseSchema>;
    };
  };
  BankRelations: {
    Server: {
      GetBankRelationsRequest: z.input<
        typeof ApiSchema.BankRelations.GetBankRelationsRequestSchema
      >;
      GetBankRelationsResponse: z.input<
        typeof ApiSchema.BankRelations.GetBankRelationsResponseSchema
      >;
      GetBankRelationResponse: z.input<
        typeof ApiSchema.BankRelations.GetBankRelationResponseSchema
      >;
      CreateBankRelationRequest: typeof ApiSchema.BankRelations.CreateBankRelationRequestSchema;
      CreateBankRelationResponse: z.input<
        typeof ApiSchema.BankRelations.CreateBankRelationResponseSchema
      >;
      UpdateBankRelationRequest: typeof ApiSchema.BankRelations.UpdateBankRelationRequestSchema;
      UpdateBankRelationResponse: z.input<
        typeof ApiSchema.BankRelations.UpdateBankRelationResponseSchema
      >;
    };
    Client: {
      BankRelation: z.infer<typeof ApiSchema.BankRelations.BankRelationsResponseSchema>;
      GetBankRelationsResponse: z.infer<
        typeof ApiSchema.BankRelations.GetBankRelationsResponseSchema
      >;
      GetBankRelationResponse: z.infer<
        typeof ApiSchema.BankRelations.GetBankRelationResponseSchema
      >;
      CreateBankRelationBody: z.infer<
        typeof ApiSchema.BankRelations.CreateBankRelationRequestSchema
      >;
      CreateBankRelationResponse: z.infer<
        typeof ApiSchema.BankRelations.CreateBankRelationResponseSchema
      >;
      UpdateBankRelationBody: z.infer<
        typeof ApiSchema.BankRelations.UpdateBankRelationRequestSchema
      >;
      UpdateBankRelationResponse: z.infer<
        typeof ApiSchema.BankRelations.UpdateBankRelationResponseSchema
      >;
      ImportStatementsBody: z.infer<
        typeof ApiSchema.BankRelationsStatementsImport.ImportStatementsRequestSchema
      >;
      ImportStatementsResponse: z.infer<
        typeof ApiSchema.BankRelationsStatementsImport.ImportStatementsResponseSchema
      >;
    };
  };
  DocumentTemplates: {
    Server: {
      GetDocumentTemplatesRequest: z.input<
        typeof ApiSchema.DocumentTemplates.GetDocumentTemplatesRequestSchema
      >;
      GetDocumentTemplatesResponse: z.input<
        typeof ApiSchema.DocumentTemplates.GetDocumentTemplatesResponseSchema
      >;
      GetDocumentTemplateResponse: z.input<
        typeof ApiSchema.DocumentTemplates.GetDocumentTemplateResponseSchema
      >;
      CreateDocumentTemplateRequest: typeof ApiSchema.DocumentTemplates.CreateDocumentTemplateRequestSchema;
      CreateDocumentTemplateResponse: z.input<
        typeof ApiSchema.DocumentTemplates.CreateDocumentTemplateResponseSchema
      >;
      UpdateDocumentTemplateRequest: typeof ApiSchema.DocumentTemplates.UpdateDocumentTemplateRequestSchema;
      UpdateDocumentTemplateResponse: z.input<
        typeof ApiSchema.DocumentTemplates.UpdateDocumentTemplateResponseSchema
      >;
    };
    Client: {
      GetDocumentTemplatesFilters: z.infer<
        typeof ApiSchema.DocumentTemplates.GetDocumentTemplatesFiltersQuerySchema
      >;
      DocumentTemplate: z.infer<typeof ApiSchema.DocumentTemplates.DocumentTemplatesResponseSchema>;
      GetDocumentTemplatesResponse: z.infer<
        typeof ApiSchema.DocumentTemplates.GetDocumentTemplatesResponseSchema
      >;
      GetDocumentTemplateResponse: z.infer<
        typeof ApiSchema.DocumentTemplates.GetDocumentTemplateResponseSchema
      >;
      CreateDocumentTemplateBody: z.infer<
        typeof ApiSchema.DocumentTemplates.CreateDocumentTemplateRequestSchema
      >;
      CreateDocumentTemplateResponse: z.infer<
        typeof ApiSchema.DocumentTemplates.CreateDocumentTemplateResponseSchema
      >;
      UpdateDocumentTemplateBody: z.infer<
        typeof ApiSchema.DocumentTemplates.UpdateDocumentTemplateRequestSchema
      >;
      UpdateDocumentTemplateResponse: z.infer<
        typeof ApiSchema.DocumentTemplates.UpdateDocumentTemplateResponseSchema
      >;
    };
  };
  TemplateContents: {
    Server: {
      GetTemplateContentsRequest: z.input<
        typeof ApiSchema.TemplateContents.GetTemplateContentsRequestSchema
      >;
      GetTemplateContentsResponse: z.input<
        typeof ApiSchema.TemplateContents.GetTemplateContentsResponseSchema
      >;
      GetTemplateContentResponse: z.input<
        typeof ApiSchema.TemplateContents.GetTemplateContentResponseSchema
      >;
      CreateTemplateContentRequest: typeof ApiSchema.TemplateContents.CreateTemplateContentRequestSchema;
      CreateTemplateContentResponse: z.input<
        typeof ApiSchema.TemplateContents.CreateTemplateContentResponseSchema
      >;
      UpdateTemplateContentRequest: typeof ApiSchema.TemplateContents.UpdateTemplateContentRequestSchema;
      UpdateTemplateContentResponse: z.input<
        typeof ApiSchema.TemplateContents.UpdateTemplateContentResponseSchema
      >;
    };
    Client: {
      GetTemplateContentsFilters: z.infer<
        typeof ApiSchema.TemplateContents.GetTemplateContentsFiltersQuerySchema
      >;
      TemplateContent: z.infer<typeof ApiSchema.TemplateContents.TemplateContentsResponseSchema>;
      GetTemplateContentsResponse: z.infer<
        typeof ApiSchema.TemplateContents.GetTemplateContentsResponseSchema
      >;
      GetTemplateContentResponse: z.infer<
        typeof ApiSchema.TemplateContents.GetTemplateContentResponseSchema
      >;
      CreateTemplateContentBody: z.infer<
        typeof ApiSchema.TemplateContents.CreateTemplateContentRequestSchema
      >;
      CreateTemplateContentResponse: z.infer<
        typeof ApiSchema.TemplateContents.CreateTemplateContentResponseSchema
      >;
      UpdateTemplateContentBody: z.infer<
        typeof ApiSchema.TemplateContents.UpdateTemplateContentRequestSchema
      >;
      UpdateTemplateContentResponse: z.infer<
        typeof ApiSchema.TemplateContents.UpdateTemplateContentResponseSchema
      >;
    };
  };
  AccountingSettings: {
    Server: {
      GetAccountingSettingsRequest: z.input<
        typeof ApiSchema.AccountingSettings.GetAccountingSettingsRequestSchema
      >;
      GetAccountingSettingsResponse: z.input<
        typeof ApiSchema.AccountingSettings.GetAccountingSettingsResponseSchema
      >;
      GetAccountingSettingResponse: z.input<
        typeof ApiSchema.AccountingSettings.GetAccountingSettingResponseSchema
      >;
      CreateAccountingSettingRequest: typeof ApiSchema.AccountingSettings.CreateAccountingSettingRequestSchema;
      CreateAccountingSettingResponse: z.input<
        typeof ApiSchema.AccountingSettings.CreateAccountingSettingResponseSchema
      >;
      UpdateAccountingSettingRequest: typeof ApiSchema.AccountingSettings.UpdateAccountingSettingRequestSchema;
      UpdateAccountingSettingResponse: z.input<
        typeof ApiSchema.AccountingSettings.UpdateAccountingSettingResponseSchema
      >;
    };
    Client: {
      GetAccountingSettingsResponse: z.infer<
        typeof ApiSchema.AccountingSettings.GetAccountingSettingsResponseSchema
      >;
      GetAccountingSettingResponse: z.infer<
        typeof ApiSchema.AccountingSettings.GetAccountingSettingResponseSchema
      >;
      CreateAccountingSettingBody: z.infer<
        typeof ApiSchema.AccountingSettings.CreateAccountingSettingRequestSchema
      >;
      CreateAccountingSettingResponse: z.infer<
        typeof ApiSchema.AccountingSettings.CreateAccountingSettingResponseSchema
      >;
    };
  };
  BillingSettings: {
    Server: {
      GetBillingSettingsRequest: z.input<
        typeof ApiSchema.BillingSettings.GetBillingSettingsRequestSchema
      >;
      GetBillingSettingsResponse: z.input<
        typeof ApiSchema.BillingSettings.GetBillingSettingsResponseSchema
      >;
      GetBillingSettingResponse: z.input<
        typeof ApiSchema.BillingSettings.GetBillingSettingResponseSchema
      >;
      CreateBillingSettingRequest: typeof ApiSchema.BillingSettings.CreateBillingSettingRequestSchema;
      CreateBillingSettingResponse: z.input<
        typeof ApiSchema.BillingSettings.CreateBillingSettingResponseSchema
      >;
      UpdateBillingSettingRequest: typeof ApiSchema.BillingSettings.UpdateBillingSettingRequestSchema;
      UpdateBillingSettingResponse: z.input<
        typeof ApiSchema.BillingSettings.UpdateBillingSettingResponseSchema
      >;
    };
    Client: {
      GetBillingSettingsResponse: z.infer<
        typeof ApiSchema.BillingSettings.GetBillingSettingsResponseSchema
      >;
      GetBillingSettingResponse: z.infer<
        typeof ApiSchema.BillingSettings.GetBillingSettingResponseSchema
      >;
      CreateBillingSettingBody: z.infer<
        typeof ApiSchema.BillingSettings.CreateBillingSettingRequestSchema
      >;
      CreateBillingSettingResponse: z.infer<
        typeof ApiSchema.BillingSettings.CreateBillingSettingResponseSchema
      >;
      UpdateBillingSettingBody: z.infer<
        typeof ApiSchema.BillingSettings.UpdateBillingSettingRequestSchema
      >;
      UpdateBillingSettingResponse: z.infer<
        typeof ApiSchema.BillingSettings.UpdateBillingSettingResponseSchema
      >;
    };
  };
  Accounts: {
    Server: {
      GetAccountsRequest: z.input<typeof ApiSchema.Accounts.GetAccountsRequestSchema>;
      GetAccountsResponse: z.input<typeof ApiSchema.Accounts.GetAccountsResponseSchema>;
      GetAccountResponse: z.input<typeof ApiSchema.Accounts.GetAccountResponseSchema>;
      CreateAccountRequest: typeof ApiSchema.Accounts.CreateAccountRequestSchema;
      CreateAccountResponse: z.input<typeof ApiSchema.Accounts.CreateAccountResponseSchema>;
      UpdateAccountRequest: typeof ApiSchema.Accounts.UpdateAccountRequestSchema;
      UpdateAccountResponse: z.input<typeof ApiSchema.Accounts.UpdateAccountResponseSchema>;
    };
    Client: {
      GetAccountsFilters: z.infer<typeof ApiSchema.Accounts.GetAccountsFiltersQuerySchema>;
      Account: z.infer<typeof ApiSchema.Accounts.AccountsResponseSchema>;
      GetAccountsResponse: z.infer<typeof ApiSchema.Accounts.GetAccountsResponseSchema>;
      GetAccountResponse: z.infer<typeof ApiSchema.Accounts.GetAccountResponseSchema>;
      CreateAccountBody: z.infer<typeof ApiSchema.Accounts.CreateAccountRequestSchema>;
      CreateAccountResponse: z.infer<typeof ApiSchema.Accounts.CreateAccountResponseSchema>;
      UpdateAccountBody: z.infer<typeof ApiSchema.Accounts.UpdateAccountRequestSchema>;
      UpdateAccountResponse: z.infer<typeof ApiSchema.Accounts.UpdateAccountResponseSchema>;
    };
  };
  SystemAccounts: {
    Server: {
      GetSystemAccountsRequest: z.input<
        typeof ApiSchema.SystemAccounts.GetSystemAccountsRequestSchema
      >;
      GetSystemAccountsResponse: z.input<
        typeof ApiSchema.SystemAccounts.GetSystemAccountsResponseSchema
      >;
      GetSystemAccountResponse: z.input<
        typeof ApiSchema.SystemAccounts.GetSystemAccountResponseSchema
      >;
      CreateSystemAccountRequest: typeof ApiSchema.SystemAccounts.CreateSystemAccountRequestSchema;
      CreateSystemAccountResponse: z.input<
        typeof ApiSchema.SystemAccounts.CreateSystemAccountResponseSchema
      >;
      UpdateSystemAccountRequest: typeof ApiSchema.SystemAccounts.UpdateSystemAccountRequestSchema;
      UpdateSystemAccountResponse: z.input<
        typeof ApiSchema.SystemAccounts.UpdateSystemAccountResponseSchema
      >;
    };
    Client: {
      GetSystemAccountsFilters: z.infer<
        typeof ApiSchema.SystemAccounts.GetSystemAccountsFiltersQuerySchema
      >;
      SystemAccount: z.infer<typeof ApiSchema.SystemAccounts.SystemAccountSchema>;
      GetSystemAccountsResponse: z.infer<
        typeof ApiSchema.SystemAccounts.GetSystemAccountsResponseSchema
      >;
      GetSystemAccountResponse: z.infer<
        typeof ApiSchema.SystemAccounts.GetSystemAccountResponseSchema
      >;
      CreateSystemAccountBody: z.infer<
        typeof ApiSchema.SystemAccounts.CreateSystemAccountRequestSchema
      >;
      CreateSystemAccountResponse: z.infer<
        typeof ApiSchema.SystemAccounts.CreateSystemAccountResponseSchema
      >;
      UpdateSystemAccountBody: z.infer<
        typeof ApiSchema.SystemAccounts.UpdateSystemAccountRequestSchema
      >;
      UpdateSystemAccountResponse: z.infer<
        typeof ApiSchema.SystemAccounts.UpdateSystemAccountResponseSchema
      >;
    };
  };
  Journal: {
    Server: {
      GetJournalEntriesRequest: z.input<typeof ApiSchema.Journal.GetJournalEntriesRequestSchema>;
      GetJournalEntriesResponse: z.input<typeof ApiSchema.Journal.GetJournalEntriesResponseSchema>;
      GetJournalEntryResponse: z.input<typeof ApiSchema.Journal.GetJournalEntryResponseSchema>;
      CreateJournalEntryRequestDefinition: typeof ApiSchema.Journal.CreateJournalEntryRequestSchema;
      CreateJournalEntryResponse: z.input<
        typeof ApiSchema.Journal.CreateJournalEntryResponseSchema
      >;
      UpdateJournalEntryRequestDefinition: typeof ApiSchema.Journal.UpdateJournalEntryRequestSchema;
      UpdateJournalEntryResponse: z.input<
        typeof ApiSchema.Journal.UpdateJournalEntryResponseSchema
      >;
    };
    Client: {
      GetJournalEntriesFilters: z.infer<
        typeof ApiSchema.Journal.GetJournalEntriesFiltersQuerySchema
      >;
      GetJournalEntriesResponse: z.infer<typeof ApiSchema.Journal.GetJournalEntriesResponseSchema>;
      GetJournalEntryResponse: z.infer<typeof ApiSchema.Journal.GetJournalEntryResponseSchema>;
      CreateJournalEntryBody: z.infer<typeof ApiSchema.Journal.CreateJournalEntryRequestSchema>;
      CreateJournalEntryResponse: z.infer<
        typeof ApiSchema.Journal.CreateJournalEntryResponseSchema
      >;
      UpdateJournalEntryBody: z.infer<typeof ApiSchema.Journal.UpdateJournalEntryRequestSchema>;
      UpdateJournalEntryResponse: z.infer<
        typeof ApiSchema.Journal.UpdateJournalEntryResponseSchema
      >;
    };
  };
  Auth: {
    Users: z.infer<typeof ApiSchema.Auth.UsersSchema>;
  };
  Clients: {
    Server: {
      GetClientsRequest: z.input<typeof ApiSchema.Clients.GetClientsRequestSchema>;
      GetClientsResponse: z.input<typeof ApiSchema.Clients.GetClientsResponseSchema>;
      GetClientResponse: z.input<typeof ApiSchema.Clients.GetClientResponseSchema>;
      CreateClientRequest: typeof ApiSchema.Clients.CreateClientRequestSchema;
      CreateClientResponse: z.input<typeof ApiSchema.Clients.CreateClientResponseSchema>;
      UpdateClientRequest: typeof ApiSchema.Clients.UpdateClientRequestSchema;
      UpdateClientResponse: z.input<typeof ApiSchema.Clients.UpdateClientResponseSchema>;
    };
    Client: {
      GetClientsFilters: z.infer<typeof ApiSchema.Clients.GetClientsFiltersQuerySchema>;
      GetClientsResponse: z.infer<typeof ApiSchema.Clients.GetClientsResponseSchema>;
      GetClientResponse: z.infer<typeof ApiSchema.Clients.GetClientResponseSchema>;
      CreateClientBody: z.infer<typeof ApiSchema.Clients.CreateClientRequestSchema>;
      CreateClientResponse: z.infer<typeof ApiSchema.Clients.CreateClientResponseSchema>;
      UpdateClientBody: z.infer<typeof ApiSchema.Clients.UpdateClientRequestSchema>;
      UpdateClientResponse: z.infer<typeof ApiSchema.Clients.UpdateClientResponseSchema>;
    };
  };
  Contacts: {
    Server: {
      GetContactsRequest: z.input<typeof ApiSchema.Contacts.GetContactsRequestSchema>;
      GetContactsResponse: z.input<typeof ApiSchema.Contacts.GetContactsResponseSchema>;
      GetContactResponse: z.input<typeof ApiSchema.Contacts.GetContactResponseSchema>;
      CreateContactRequest: typeof ApiSchema.Contacts.CreateContactRequestSchema;
      CreateContactResponse: z.input<typeof ApiSchema.Contacts.CreateContactResponseSchema>;
      UpdateContactRequest: typeof ApiSchema.Contacts.UpdateContactRequestSchema;
      UpdateContactResponse: z.input<typeof ApiSchema.Contacts.UpdateContactResponseSchema>;
    };
    Client: {
      GetContactsFilters: z.infer<typeof ApiSchema.Contacts.GetContactsFiltersQuerySchema>;
      GetContactsResponse: z.infer<typeof ApiSchema.Contacts.GetContactsResponseSchema>;
      GetContactResponse: z.infer<typeof ApiSchema.Contacts.GetContactResponseSchema>;
      CreateContactBody: z.infer<typeof ApiSchema.Contacts.CreateContactRequestSchema>;
      CreateContactResponse: z.infer<typeof ApiSchema.Contacts.CreateContactResponseSchema>;
      UpdateContactBody: z.infer<typeof ApiSchema.Contacts.UpdateContactRequestSchema>;
      UpdateContactResponse: z.infer<typeof ApiSchema.Contacts.UpdateContactResponseSchema>;
    };
  };
  JournalSummaries: {
    Server: {
      GetJournalSummariesResponse: z.input<
        typeof ApiSchema.JournalSummaries.GetJournalSummariesResponseSchema
      >;
      GetJournalSummaryResponse: z.input<
        typeof ApiSchema.JournalSummaries.GetJournalSummaryResponseSchema
      >;
    };
    Client: {
      GetJournalSummariesFilters: z.infer<
        typeof ApiSchema.JournalSummaries.GetJournalSummariesFiltersQuerySchema
      >;
      JournalSummary: z.infer<typeof ApiSchema.JournalSummaries.JournalSummarySchema>;
      GetJournalSummariesResponse: z.infer<
        typeof ApiSchema.JournalSummaries.GetJournalSummariesResponseSchema
      >;
      GetJournalSummaryResponse: z.infer<
        typeof ApiSchema.JournalSummaries.GetJournalSummaryResponseSchema
      >;
    };
  };
  BankMovements: {
    Server: {
      GetBankMovementsResponse: z.input<
        typeof ApiSchema.BankMovements.GetBankMovementsResponseSchema
      >;
      GetBankMovementResponse: z.input<
        typeof ApiSchema.BankMovements.GetBankMovementResponseSchema
      >;
    };
    Client: {
      GetBankMovementsFilters: z.infer<
        typeof ApiSchema.BankMovements.GetBankMovementsFiltersQuerySchema
      >;
      BankMovement: z.infer<typeof ApiSchema.BankMovements.BankMovementSchema>;
      GetBankMovementsResponse: z.infer<
        typeof ApiSchema.BankMovements.GetBankMovementsResponseSchema
      >;
      GetBankMovementResponse: z.infer<
        typeof ApiSchema.BankMovements.GetBankMovementResponseSchema
      >;
      ReconcileBankMovementBody: z.infer<
        typeof ApiSchema.BankMovementsReconcile.ReconcileBankMovementRequestSchema
      >;
      ReconcileBankMovementResponse: z.infer<
        typeof ApiSchema.BankMovementsReconcile.ReconcileBankMovementResponseSchema
      >;
      IgnoreBankMovementResponse: z.infer<
        typeof ApiSchema.BankMovementsIgnore.IgnoreBankMovementResponseSchema
      >;
    };
  };
  BankMovementSummaries: {
    Server: {
      GetBankMovementSummariesResponse: z.input<
        typeof ApiSchema.BankMovementSummaries.GetBankMovementSummariesResponseSchema
      >;
    };
    Client: {
      GetBankMovementSummariesFilters: z.infer<
        typeof ApiSchema.BankMovementSummaries.GetBankMovementSummariesFiltersQuerySchema
      >;
      BankMovementSummary: z.infer<
        typeof ApiSchema.BankMovementSummaries.BankMovementSummarySchema
      >;
      GetBankMovementSummariesResponse: z.infer<
        typeof ApiSchema.BankMovementSummaries.GetBankMovementSummariesResponseSchema
      >;
    };
  };
  BankRelationSummaries: {
    Server: {
      GetBankRelationSummariesResponse: z.input<
        typeof ApiSchema.BankRelationSummaries.GetBankRelationSummariesResponseSchema
      >;
    };
    Client: {
      BankRelationSummary: z.infer<
        typeof ApiSchema.BankRelationSummaries.BankRelationSummarySchema
      >;
      GetBankRelationSummariesResponse: z.infer<
        typeof ApiSchema.BankRelationSummaries.GetBankRelationSummariesResponseSchema
      >;
    };
  };
  VatMethodSummaries: {
    Server: {
      GetVatMethodSummariesResponse: z.input<
        typeof ApiSchema.VatMethodSummaries.GetVatMethodSummariesResponseSchema
      >;
    };
    Client: {
      VatMethodSummary: z.infer<typeof ApiSchema.VatMethodSummaries.VatMethodSummarySchema>;
      GetVatMethodSummariesResponse: z.infer<
        typeof ApiSchema.VatMethodSummaries.GetVatMethodSummariesResponseSchema
      >;
    };
  };
  MigrationDatasetSummaries: {
    Server: {
      GetDatasetSummariesResponse: z.input<
        typeof ApiSchema.MigrationDatasetSummaries.GetDatasetSummariesResponseSchema
      >;
    };
    Client: {
      DatasetSummary: z.infer<typeof ApiSchema.MigrationDatasetSummaries.DatasetSummarySchema>;
      GetDatasetSummariesResponse: z.infer<
        typeof ApiSchema.MigrationDatasetSummaries.GetDatasetSummariesResponseSchema
      >;
      GetDatasetSummariesFilters: z.infer<
        typeof ApiSchema.MigrationDatasetSummaries.GetDatasetSummariesFiltersSchema
      >;
    };
  };
  OrganizationMembers: {
    Server: {
      GetOrganizationMembersResponse: z.input<
        typeof ApiSchema.OrganizationMembers.GetOrganizationMembersResponseSchema
      >;
    };
    Client: {
      OrganizationMember: z.infer<typeof ApiSchema.OrganizationMembers.OrganizationMemberSchema>;
      GetOrganizationMembersResponse: z.infer<
        typeof ApiSchema.OrganizationMembers.GetOrganizationMembersResponseSchema
      >;
    };
  };
  Invitations: {
    Server: {
      GetInvitationsResponse: z.input<typeof ApiSchema.Invitations.GetInvitationsResponseSchema>;
    };
    Client: {
      Invitation: z.infer<typeof ApiSchema.Invitations.InvitationSchema>;
      GetInvitationsResponse: z.infer<typeof ApiSchema.Invitations.GetInvitationsResponseSchema>;
    };
  };
  InvitationsCreate: {
    Server: {
      CreateInvitationResponse: z.input<
        typeof ApiSchema.InvitationsCreate.CreateInvitationResponseSchema
      >;
    };
    Client: {
      CreateInvitationBody: z.infer<
        typeof ApiSchema.InvitationsCreate.CreateInvitationRequestSchema
      >;
      CreateInvitationResponse: z.infer<
        typeof ApiSchema.InvitationsCreate.CreateInvitationResponseSchema
      >;
    };
  };
  InvitationsPreview: {
    Client: {
      PreviewInvitationResponse: z.infer<
        typeof ApiSchema.InvitationsPreview.PreviewInvitationResponseSchema
      >;
    };
  };
  InvitationsAccept: {
    Client: {
      AcceptInvitationResponse: z.infer<
        typeof ApiSchema.InvitationsAccept.AcceptInvitationResponseSchema
      >;
    };
  };
  InvoiceSummaries: {
    Server: {
      GetInvoiceSummariesResponse: z.input<
        typeof ApiSchema.InvoiceSummaries.GetInvoiceSummariesResponseSchema
      >;
      GetInvoiceSummaryResponse: z.input<
        typeof ApiSchema.InvoiceSummaries.GetInvoiceSummaryResponseSchema
      >;
    };
    Client: {
      GetInvoiceSummariesFilters: z.infer<
        typeof ApiSchema.InvoiceSummaries.GetInvoiceSummariesFiltersQuerySchema
      >;
      InvoiceSummary: z.infer<typeof ApiSchema.InvoiceSummaries.InvoiceSummarySchema>;
      GetInvoiceSummariesResponse: z.infer<
        typeof ApiSchema.InvoiceSummaries.GetInvoiceSummariesResponseSchema
      >;
      GetInvoiceSummaryResponse: z.infer<
        typeof ApiSchema.InvoiceSummaries.GetInvoiceSummaryResponseSchema
      >;
    };
  };
  Invoices: {
    Server: {
      GetInvoicesRequest: z.input<typeof ApiSchema.Invoices.GetInvoicesRequestSchema>;
      GetInvoicesResponse: z.input<typeof ApiSchema.Invoices.GetInvoicesResponseSchema>;
      GetInvoiceResponse: z.input<typeof ApiSchema.Invoices.GetInvoiceResponseSchema>;
      CreateInvoiceRequest: typeof ApiSchema.Invoices.CreateInvoiceRequestSchema;
      CreateInvoiceResponse: z.input<typeof ApiSchema.Invoices.CreateInvoiceResponseSchema>;
      UpdateInvoiceRequest: typeof ApiSchema.Invoices.UpdateInvoiceRequestSchema;
      UpdateInvoiceResponse: z.input<typeof ApiSchema.Invoices.UpdateInvoiceResponseSchema>;
    };
    Client: {
      GetInvoicesFilters: z.infer<typeof ApiSchema.Invoices.GetInvoicesFiltersQuerySchema>;
      Invoice: z.infer<typeof ApiSchema.Invoices.InvoiceSchema>;
      GetInvoicesResponse: z.infer<typeof ApiSchema.Invoices.GetInvoicesResponseSchema>;
      GetInvoiceResponse: z.infer<typeof ApiSchema.Invoices.GetInvoiceResponseSchema>;
      CreateInvoiceBody: z.infer<typeof ApiSchema.Invoices.CreateInvoiceRequestSchema>;
      CreateInvoiceResponse: z.infer<typeof ApiSchema.Invoices.CreateInvoiceResponseSchema>;
      OpenInvoiceResponse: z.infer<typeof ApiSchema.InvoicesOpen.OpenInvoiceResponseSchema>;
      PayInvoiceBody: z.infer<typeof ApiSchema.InvoicesPay.PayInvoiceRequestSchema>;
      PayInvoiceResponse: z.infer<typeof ApiSchema.InvoicesPay.PayInvoiceResponseSchema>;
      VoidInvoiceBody: z.infer<typeof ApiSchema.InvoicesVoid.VoidInvoiceRequestSchema>;
      VoidInvoiceResponse: z.infer<typeof ApiSchema.InvoicesVoid.VoidInvoiceResponseSchema>;
      UncollectibleInvoiceBody: z.infer<
        typeof ApiSchema.InvoicesUncollectible.UncollectibleInvoiceRequestSchema
      >;
      UncollectibleInvoiceResponse: z.infer<
        typeof ApiSchema.InvoicesUncollectible.UncollectibleInvoiceResponseSchema
      >;
      GeneratePdfInvoiceBody: z.infer<typeof ApiSchema.InvoicesPdf.GeneratePdfInvoiceRequestSchema>;
      PdfInvoiceResponse: z.infer<typeof ApiSchema.InvoicesPdf.PdfInvoiceResponseSchema>;
      PdfInvoiceJobStateResponse: z.infer<
        typeof ApiSchema.InvoicesPdf.PdfInvoiceJobStateResponseSchema
      >;
    };
  };
  InvoicesLines: {
    Server: {
      GetLinesRequest: z.input<typeof ApiSchema.Lines.GetLinesRequestSchema>;
      GetLinesResponse: z.input<typeof ApiSchema.Lines.GetLinesResponseSchema>;
      GetLineResponse: z.input<typeof ApiSchema.Lines.GetLineResponseSchema>;
      CreateLineRequest: typeof ApiSchema.Lines.CreateLineRequestSchema;
      CreateLineResponse: z.input<typeof ApiSchema.Lines.CreateLineResponseSchema>;
      UpdateLineRequest: typeof ApiSchema.Lines.UpdateLineRequestSchema;
      UpdateLineResponse: z.input<typeof ApiSchema.Lines.UpdateLineResponseSchema>;
    };
    Client: {
      GetLinesFilters: z.infer<typeof ApiSchema.Lines.GetLinesFiltersQuerySchema>;
      GetLinesResponse: z.infer<typeof ApiSchema.Lines.GetLinesResponseSchema>;
      GetLineResponse: z.infer<typeof ApiSchema.Lines.GetLineResponseSchema>;
      CreateLineBody: z.infer<typeof ApiSchema.Lines.CreateLineRequestSchema>;
      CreateLineResponse: z.infer<typeof ApiSchema.Lines.CreateLineResponseSchema>;
    };
  };
  LlmUsage: {
    Server: {
      GetLlmUsageResponse: z.input<typeof ApiSchema.LlmUsage.GetLlmUsageResponseSchema>;
    };
    Client: {
      LlmUsage: z.infer<typeof ApiSchema.LlmUsage.LlmUsageSchema>;
      GetLlmUsageResponse: z.infer<typeof ApiSchema.LlmUsage.GetLlmUsageResponseSchema>;
    };
  };
  Assistant: {
    Server: {
      GetAssistantResponse: z.input<typeof ApiSchema.Assistant.GetAssistantResponseSchema>;
    };
    Client: {
      Assistant: z.infer<typeof ApiSchema.Assistant.AssistantSchema>;
      GetAssistantResponse: z.infer<typeof ApiSchema.Assistant.GetAssistantResponseSchema>;
    };
  };
  UserApiKeys: {
    Server: {
      CreateApiKeyRequest: typeof ApiSchema.UserApiKeys.CreateApiKeyRequestSchema;
      CreateApiKeyResponse: z.input<typeof ApiSchema.UserApiKeys.CreateApiKeyResponseSchema>;
      GetApiKeysResponse: z.input<typeof ApiSchema.UserApiKeys.GetApiKeysResponseSchema>;
    };
    Client: {
      ApiKey: z.infer<typeof ApiSchema.UserApiKeys.ApiKeySchema>;
      CreateApiKeyBody: z.infer<typeof ApiSchema.UserApiKeys.CreateApiKeyRequestSchema>;
      CreateApiKeyResponse: z.infer<typeof ApiSchema.UserApiKeys.CreateApiKeyResponseSchema>;
      GetApiKeysResponse: z.infer<typeof ApiSchema.UserApiKeys.GetApiKeysResponseSchema>;
    };
  };
  Chat: {
    Server: {
      ChatRequest: typeof ApiSchema.Chat.ChatRequestSchema;
    };
    Client: {
      ChatMessage: z.infer<typeof ApiSchema.Chat.ChatMessageSchema>;
      ChatDomain: z.infer<typeof ApiSchema.Chat.ChatDomainSchema>;
      ChatRequest: z.infer<typeof ApiSchema.Chat.ChatRequestSchema>;
      ChatEvent: z.infer<typeof ApiSchema.Chat.ChatEventSchema>;
    };
  };
  Conversations: {
    Server: {
      GetConversationsResponse: z.input<
        typeof ApiSchema.Conversations.GetConversationsResponseSchema
      >;
      GetConversationResponse: z.input<
        typeof ApiSchema.Conversations.GetConversationResponseSchema
      >;
    };
    Client: {
      Conversation: z.infer<typeof ApiSchema.Conversations.ConversationSchema>;
      Chat: z.infer<typeof ApiSchema.Conversations.ChatSchema>;
      GetConversationsResponse: z.infer<
        typeof ApiSchema.Conversations.GetConversationsResponseSchema
      >;
      GetConversationResponse: z.infer<
        typeof ApiSchema.Conversations.GetConversationResponseSchema
      >;
    };
  };
  Messages: {
    Server: {
      GetMessagesResponse: z.input<typeof ApiSchema.Messages.GetMessagesResponseSchema>;
    };
    Client: {
      GetMessagesFilters: z.infer<typeof ApiSchema.Messages.GetMessagesFiltersQuerySchema>;
      Message: z.infer<typeof ApiSchema.Messages.MessageSchema>;
      GetMessagesResponse: z.infer<typeof ApiSchema.Messages.GetMessagesResponseSchema>;
    };
  };
  Currencies: {
    Server: {
      GetCurrenciesRequest: z.input<typeof ApiSchema.Currencies.GetCurrenciesRequestSchema>;
      GetCurrenciesResponse: z.input<typeof ApiSchema.Currencies.GetCurrenciesResponseSchema>;
      GetCurrencyResponse: z.input<typeof ApiSchema.Currencies.GetCurrencyResponseSchema>;
      CreateCurrencyRequest: typeof ApiSchema.Currencies.CreateCurrencyRequestSchema;
      CreateCurrencyResponse: z.input<typeof ApiSchema.Currencies.CreateCurrencyResponseSchema>;
    };
    Client: {
      Currency: z.infer<typeof ApiSchema.Currencies.CurrencySchema>;
      GetCurrenciesResponse: z.infer<typeof ApiSchema.Currencies.GetCurrenciesResponseSchema>;
      GetCurrencyResponse: z.infer<typeof ApiSchema.Currencies.GetCurrencyResponseSchema>;
      CreateCurrencyBody: z.infer<typeof ApiSchema.Currencies.CreateCurrencyRequestSchema>;
      CreateCurrencyResponse: z.infer<typeof ApiSchema.Currencies.CreateCurrencyResponseSchema>;
    };
  };
  Migrations: {
    Server: {
      GetMigrationsResponse: z.input<typeof ApiSchema.Migrations.GetMigrationsResponseSchema>;
      GetMigrationResponse: z.input<typeof ApiSchema.Migrations.GetMigrationResponseSchema>;
      CreateMigrationRequest: typeof ApiSchema.Migrations.CreateMigrationRequestSchema;
      CreateMigrationResponse: z.input<typeof ApiSchema.Migrations.CreateMigrationResponseSchema>;
    };
    Client: {
      Migration: z.infer<typeof ApiSchema.Migrations.MigrationSchema>;
      GetMigrationsResponse: z.infer<typeof ApiSchema.Migrations.GetMigrationsResponseSchema>;
      GetMigrationResponse: z.infer<typeof ApiSchema.Migrations.GetMigrationResponseSchema>;
      CreateMigrationBody: z.infer<typeof ApiSchema.Migrations.CreateMigrationRequestSchema>;
      CreateMigrationResponse: z.infer<typeof ApiSchema.Migrations.CreateMigrationResponseSchema>;
    };
  };
  MigrationsDatasets: {
    Server: {
      GetDatasetsResponse: z.input<typeof ApiSchema.MigrationsDatasets.GetDatasetsResponseSchema>;
      UploadDatasetResponse: z.input<
        typeof ApiSchema.MigrationsDatasets.UploadDatasetResponseSchema
      >;
    };
    Client: {
      Dataset: z.infer<typeof ApiSchema.MigrationsDatasets.DatasetSchema>;
      UploadDatasetBody: z.infer<typeof ApiSchema.MigrationsDatasets.UploadDatasetRequestSchema>;
      GetDatasetsResponse: z.infer<typeof ApiSchema.MigrationsDatasets.GetDatasetsResponseSchema>;
      UploadDatasetResponse: z.infer<
        typeof ApiSchema.MigrationsDatasets.UploadDatasetResponseSchema
      >;
    };
  };
  MigrationsRun: {
    Server: {
      RunMigrationResponse: z.input<typeof ApiSchema.MigrationsRun.RunMigrationResponseSchema>;
      RunMigrationJobStateResponse: z.input<
        typeof ApiSchema.MigrationsRun.RunMigrationJobStateResponseSchema
      >;
    };
    Client: {
      RunMigrationResponse: z.infer<typeof ApiSchema.MigrationsRun.RunMigrationResponseSchema>;
      RunMigrationJobStateResponse: z.infer<
        typeof ApiSchema.MigrationsRun.RunMigrationJobStateResponseSchema
      >;
    };
  };
}

interface Common {
  Error: z.infer<typeof CommonSchema.Error.ErrorSchema>;
  RouteIdParams: z.infer<typeof CommonSchema.Params.RouteIdParamsSchema>;
  RouteParentIdParams: z.infer<typeof CommonSchema.Params.RouteParentIdParamsSchema>;
  ChildRouteIdParams: z.infer<typeof CommonSchema.Params.ChildRouteIdParamsSchema>;
  ListQuery: z.infer<typeof CommonSchema.Query.ListQuerySchema>;
}

export type { Api, Common };
