import * as OrganizationsSchema from "./schemas/core/organizations";
import * as CurrenciesSchema from "./schemas/core/currencies";
import * as MembershipsSchema from "./schemas/core/memberships";
import * as InvitationsSchema from "./schemas/core/invitations";
import * as PeriodsSchema from "./schemas/ledger/periods";
import * as AccountsSchema from "./schemas/ledger/accounts";
import * as SystemAccountsSchema from "./schemas/ledger/accounts-system";
import * as JournalSchema from "./schemas/ledger/journal";
import * as PeriodJournalSchema from "./schemas/ledger/period-journal";
import * as PostingManualVatPostingsSchema from "./schemas/ledger/posting-manual-vat-postings";
import * as AuthSchema from "./schemas/auth/auth";
import * as ClientsSchema from "./schemas/billing/clients";
import * as InvoicesSchema from "./schemas/billing/invoices";
import * as InvoiceJournalSchema from "./schemas/billing/invoice-journal";
import * as StatementsSchema from "./schemas/banking/statements";
import * as MovementsSchema from "./schemas/banking/movements";
import * as MovementJournalSchema from "./schemas/banking/movement-journal";
import * as VatSchema from "./schemas/core/vat";
import * as AccountingSchema from "./schemas/core/accounting";
import * as BankSchema from "./schemas/core/bank";
import * as BillingSchema from "./schemas/core/billing";
import * as DocumentsSchema from "./schemas/core/documents";
import * as UsersSchema from "./schemas/auth/users";
import * as LlmUsagesSchema from "./schemas/metering/llm-usages";
import * as LlmReservationsSchema from "./schemas/metering/llm-reservations";
import * as ConversationsSchema from "./schemas/chat/conversations";
import * as MessagesSchema from "./schemas/chat/messages";
import * as LogsSchema from "./schemas/audit/logs";
import * as MigrationsSchema from "./schemas/migration/migrations";
import * as MigrationDatasetsSchema from "./schemas/migration/datasets";

const DbSchema = {
  Auth: {
    Auth: AuthSchema,
    Users: UsersSchema,
  },
  Core: {
    Organizations: OrganizationsSchema,
    Memberships: MembershipsSchema,
    Invitations: InvitationsSchema,
    Vat: VatSchema,
    Currencies: CurrenciesSchema,
    Accounting: AccountingSchema,
    Bank: BankSchema,
    Billing: BillingSchema,
    Documents: DocumentsSchema,
  },
  Ledger: {
    Periods: PeriodsSchema,
    Accounts: AccountsSchema,
    SystemAccounts: SystemAccountsSchema,
    Journal: JournalSchema,
    PeriodJournal: PeriodJournalSchema,
    PostingManualVatPostings: PostingManualVatPostingsSchema,
  },
  Billing: {
    Clients: ClientsSchema,
    Invoices: InvoicesSchema,
    InvoiceJournal: InvoiceJournalSchema,
  },
  Banking: {
    Statements: StatementsSchema,
    Movements: MovementsSchema,
    MovementJournal: MovementJournalSchema,
  },
  Metering: {
    LlmUsages: LlmUsagesSchema,
    LlmReservations: LlmReservationsSchema,
  },
  Chat: {
    Conversations: ConversationsSchema,
    Messages: MessagesSchema,
  },
  Audit: {
    Logs: LogsSchema,
  },
  Migration: {
    Migrations: MigrationsSchema,
    Datasets: MigrationDatasetsSchema,
  },
};

export { DbSchema };
