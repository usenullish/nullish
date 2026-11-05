import * as OrganizationsSchema from "./api/organizations";
import * as OrganizationsDeleteSchema from "./api/organizations+delete";
import * as PeriodsSchema from "./api/periods";
import * as PeriodsCloseSchema from "./api/periods+close";
import * as CurrenciesSchema from "./api/currencies";
import * as AccountsSchema from "./api/accounts";
import * as SystemAccountsSchema from "./api/accounts-system";
import * as JournalSchema from "./api/journal";
import * as JournalSummariesSchema from "./api/journal-summaries";
import * as AuthSchema from "./api/auth";
import * as ClientsSchema from "./api/clients";
import * as ContactsSchema from "./api/clients+contacts";
import * as InvoicesSchema from "./api/invoices";
import * as InvoiceSummariesSchema from "./api/invoice-summaries";
import * as InvoicesOpenSchema from "./api/invoices+open";
import * as InvoicesPaySchema from "./api/invoices+pay";
import * as InvoicesPdfSchema from "./api/invoices+pdf+generate";
import * as InvoicesVoidSchema from "./api/invoices+void";
import * as InvoicesUncollectibleSchema from "./api/invoices+uncollectible";
import * as LinesSchema from "./api/invoices+lines";
import * as VatSettingsSchema from "./api/vat+settings";
import * as VatMethodsSchema from "./api/vat+methods";
import * as VatRatesSchema from "./api/vat+rates";
import * as VatPeriodsSchema from "./api/vat+periods";
import * as AccountingSettingsSchema from "./api/accounting+settings";
import * as BillingSettingsSchema from "./api/billing+settings";
import * as DocumentTemplatesSchema from "./api/document-templates";
import * as TemplateContentsSchema from "./api/document-templates+contents";
import * as BankRelationsSchema from "./api/bank-relations";
import * as BankRelationsStatementsImportSchema from "./api/bank-relations+statements+import";
import * as BankRelationSummariesSchema from "./api/bank-relation-summaries";
import * as OrganizationMembersSchema from "./api/organization-members";
import * as InvitationsSchema from "./api/invitations";
import * as InvitationsCreateSchema from "./api/invitations+create";
import * as InvitationsPreviewSchema from "./api/invitations+preview";
import * as InvitationsAcceptSchema from "./api/invitations+accept";
import * as InvitationsDeclineSchema from "./api/invitations+decline";
import * as BankMovementsSchema from "./api/bank-movements";
import * as BankMovementsReconcileSchema from "./api/bank-movements+reconcile";
import * as BankMovementsIgnoreSchema from "./api/bank-movements+ignore";
import * as BankMovementSummariesSchema from "./api/bank-movement-summaries";
import * as ErrorSchema from "./common/error";
import * as ParamsSchema from "./common/params";
import * as QuerySchema from "./common/query";
import * as LedgerReportsSchema from "./api/organizations+reports+ledger";
import * as AccountBalancesView from "./api/organizations+reports+account-balances";
import * as BalanceSheetView from "./api/organizations+reports+balance-sheet";
import * as AccountLedgerSchema from "./api/organizations+reports+account-ledger";
import * as ActiveAccountsSchema from "./api/organizations+reports+active-accounts";
import * as IncomeStatementView from "./api/organizations+reports+income-statement";
import * as VatReportsSchema from "./api/organizations+reports+vat";
import * as ChatSchema from "./api/chat";
import * as ConversationsSchema from "./api/chat+conversations";
import * as MessagesSchema from "./api/chat+conversations+messages";
import * as UserApiKeysSchema from "./api/user+api-keys";
import * as LlmUsageSchema from "./api/user+reports+llm-usage";
import * as AssistantSchema from "./api/user+assistant";
import * as MigrationsSchema from "./api/migrations";
import * as MigrationsDatasetsSchema from "./api/migrations+datasets";
import * as MigrationsRunSchema from "./api/migrations+run";

const ApiSchema = {
  Periods: PeriodsSchema,
  PeriodsClose: PeriodsCloseSchema,
  Organizations: OrganizationsSchema,
  OrganizationsDelete: OrganizationsDeleteSchema,
  VatSettings: VatSettingsSchema,
  VatMethods: VatMethodsSchema,
  VatRates: VatRatesSchema,
  VatPeriods: VatPeriodsSchema,
  Accounts: AccountsSchema,
  SystemAccounts: SystemAccountsSchema,
  Journal: JournalSchema,
  JournalSummaries: JournalSummariesSchema,
  Auth: AuthSchema,
  Clients: ClientsSchema,
  Contacts: ContactsSchema,
  Invoices: InvoicesSchema,
  InvoiceSummaries: InvoiceSummariesSchema,
  Lines: LinesSchema,
  InvoicesOpen: InvoicesOpenSchema,
  InvoicesPay: InvoicesPaySchema,
  InvoicesVoid: InvoicesVoidSchema,
  InvoicesUncollectible: InvoicesUncollectibleSchema,
  InvoicesPdf: InvoicesPdfSchema,
  Currencies: CurrenciesSchema,
  AccountingSettings: AccountingSettingsSchema,
  BillingSettings: BillingSettingsSchema,
  DocumentTemplates: DocumentTemplatesSchema,
  TemplateContents: TemplateContentsSchema,
  BankRelations: BankRelationsSchema,
  BankRelationsStatementsImport: BankRelationsStatementsImportSchema,
  BankRelationSummaries: BankRelationSummariesSchema,
  OrganizationMembers: OrganizationMembersSchema,
  Invitations: InvitationsSchema,
  InvitationsCreate: InvitationsCreateSchema,
  InvitationsPreview: InvitationsPreviewSchema,
  InvitationsAccept: InvitationsAcceptSchema,
  InvitationsDecline: InvitationsDeclineSchema,
  BankMovements: BankMovementsSchema,
  BankMovementsReconcile: BankMovementsReconcileSchema,
  BankMovementsIgnore: BankMovementsIgnoreSchema,
  BankMovementSummaries: BankMovementSummariesSchema,
  LedgerReports: LedgerReportsSchema,
  AccountBalances: AccountBalancesView,
  BalanceSheet: BalanceSheetView,
  AccountLedger: AccountLedgerSchema,
  ActiveAccounts: ActiveAccountsSchema,
  IncomeStatement: IncomeStatementView,
  VatReports: VatReportsSchema,
  Chat: ChatSchema,
  Conversations: ConversationsSchema,
  Messages: MessagesSchema,
  UserApiKeys: UserApiKeysSchema,
  LlmUsage: LlmUsageSchema,
  Assistant: AssistantSchema,
  Migrations: MigrationsSchema,
  MigrationsDatasets: MigrationsDatasetsSchema,
  MigrationsRun: MigrationsRunSchema,
};

const CommonSchema = {
  Error: ErrorSchema,
  Params: ParamsSchema,
  Query: QuerySchema,
};

export { ApiSchema, CommonSchema };
