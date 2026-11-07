import { Resource, type ResourceClass } from "./_factories/resource";
import { OrganizationsHandlers } from "./_organizations";
import { VatSettingsHandlers } from "./_organizations+vat+settings";
import { VatMethodsHandlers } from "./_organizations+vat+methods";
import { VatRatesHandlers } from "./_organizations+vat+rates";
import { VatPeriodsHandlers } from "./_organizations+vat+periods";
import { AccountsHandlers } from "./_organizations+accounts";
import { PeriodsHandlers } from "./_organizations+periods";
import { PeriodsCloseHandlers } from "./_periods+close";
import { ClientsHandlers } from "./_organizations+clients";
import { ContactsHandlers } from "./_clients+contacts";
import { InvoicesHandlers } from "./_organizations+invoices";
import { InvoiceSummariesHandlers } from "./_organizations+invoice-summaries";
import { JournalSummariesHandlers } from "./_organizations+journal-summaries";
import { LinesHandlers } from "./_invoices+lines";
import { InvoicesOpenHandlers } from "./_invoices+open";
import { JournalsHandlers } from "./_organizations+journal";
import { JournalCreateHandlers } from "./_organizations+journal+create";
import { JournalUpdateHandlers } from "./_journal+update";
import { CurrenciesHandlers } from "./_currencies";
import { AccountingSettingsHandlers } from "./_organizations+accouting+settings";
import { BillingSettingsHandlers } from "./_organizations+billing+settings";
import { DocumentTemplatesHandlers } from "./_organizations+document-templates";
import { TemplateContentsHandlers } from "./_document-templates+contents";
import { BankRelationsHandlers } from "./_organizations+bank-relations";
import { BankRelationsStatementsImportHandlers } from "./_bank-relations+statements+import";
import { BankRelationSummariesHandlers } from "./_organizations+bank-relation-summaries";
import { VatMethodSummariesHandlers } from "./_organizations+vat+method-summaries";
import { OrganizationMembersHandlers } from "./_organizations+members";
import { MembersDeleteHandlers } from "./_members+delete";
import { OrganizationsDeleteHandlers } from "./_organizations+delete";
import { InvitationsHandlers } from "./_organizations+invitations";
import { InvitationsCreateHandlers } from "./_organizations+invitations+create";
import { InvitationsPreviewHandlers } from "./_invitations+preview";
import { InvitationsAcceptHandlers } from "./_invitations+accept";
import { InvitationsDeclineHandlers } from "./_invitations+decline";
import { BankMovementsHandlers } from "./_bank-relations+movements";
import { BankMovementSummariesHandlers } from "./_bank-relations+movement-summaries";
import { BankMovementsReconcileHandlers } from "./_bank-movements+reconcile";
import { BankMovementsIgnoreHandlers } from "./_bank-movements+ignore";
import { InvoicesPayHandlers } from "./_invoices+pay";
import { InvoicesVoidHandlers } from "./_invoices+void";
import { InvoicesUncollectibleHandlers } from "./_invoices+uncollectible";
import { SystemAccountsHandlers } from "./_organizations+accounts-system";
import type { App } from "../types/app";
import { OrganizationsReports } from "./_organizations+reports";
import { OrganizationsReportsVat } from "./_organizations+reports+vat";
import { OrganizationsReportsAccountLedger } from "./_organizations+reports+account-ledger";
import { OrganizationsReportsActiveAccounts } from "./_organizations+reports+active-accounts";
import { InvoicesPdfGenerateHandlers } from "./_invoices+pdf+generate";
import { InvoicesPdfJobsHandlers } from "./_invoices+pdf+jobs";
import { InvoicesPdfDocumentsDownloadHandlers } from "./_invoices+pdf+documents+download";
import { ChatHandlers } from "./_chat";
import { ConversationsHandlers } from "./_chat+conversations";
import { OrganizationConversationsHandlers } from "./_organizations+conversations";
import { MessagesHandlers } from "./_chat+conversations+messages";
import { UserApiKeysHandlers } from "./_user+api-keys";
import { UserReportsLlmUsage } from "./_user+reports+llm-usage";
import { UserAssistant } from "./_user+assistant";
import { MigrationsHandlers } from "./_organizations+migrations";
import { MigrationDatasetSummariesHandlers } from "./_organizations+migration-dataset-summaries";
import { MigrationsDatasetsHandlers } from "./_migrations+datasets";
import { MigrationsRunHandlers } from "./_migrations+run";
import { MigrationsRunJobsHandlers } from "./_migrations+run+jobs";

const initResource = ({
  resourceClass,
  app,
}: {
  resourceClass: ResourceClass;
  app: App;
}): Resource => resourceClass.create({ app });

const RESOURCES = [
  OrganizationsHandlers,
  OrganizationsDeleteHandlers,
  OrganizationMembersHandlers,
  MembersDeleteHandlers,
  InvitationsPreviewHandlers,
  InvitationsAcceptHandlers,
  InvitationsDeclineHandlers,
  InvitationsHandlers,
  InvitationsCreateHandlers,
  VatSettingsHandlers,
  VatMethodsHandlers,
  VatRatesHandlers,
  VatPeriodsHandlers,
  VatMethodSummariesHandlers,
  AccountingSettingsHandlers,
  BillingSettingsHandlers,
  DocumentTemplatesHandlers,
  TemplateContentsHandlers,
  BankRelationsHandlers,
  BankRelationsStatementsImportHandlers,
  BankRelationSummariesHandlers,
  BankMovementsHandlers,
  BankMovementSummariesHandlers,
  BankMovementsReconcileHandlers,
  BankMovementsIgnoreHandlers,
  AccountsHandlers,
  SystemAccountsHandlers,
  PeriodsHandlers,
  PeriodsCloseHandlers,
  ClientsHandlers,
  ContactsHandlers,
  InvoicesHandlers,
  InvoiceSummariesHandlers,
  JournalSummariesHandlers,
  LinesHandlers,
  InvoicesOpenHandlers,
  InvoicesPayHandlers,
  InvoicesVoidHandlers,
  InvoicesUncollectibleHandlers,
  InvoicesPdfGenerateHandlers,
  InvoicesPdfJobsHandlers,
  InvoicesPdfDocumentsDownloadHandlers,
  JournalsHandlers,
  JournalCreateHandlers,
  JournalUpdateHandlers,
  CurrenciesHandlers,
  OrganizationsReports,
  OrganizationsReportsVat,
  OrganizationsReportsAccountLedger,
  OrganizationsReportsActiveAccounts,
  ChatHandlers,
  ConversationsHandlers,
  OrganizationConversationsHandlers,
  MessagesHandlers,
  UserApiKeysHandlers,
  UserReportsLlmUsage,
  UserAssistant,
  MigrationsHandlers,
  MigrationDatasetSummariesHandlers,
  MigrationsDatasetsHandlers,
  MigrationsRunHandlers,
  MigrationsRunJobsHandlers,
];

export const initResources = ({ app }: { app: App }) =>
  RESOURCES.map((resourceClass) => initResource({ resourceClass, app }));
