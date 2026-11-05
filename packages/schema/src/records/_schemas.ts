import * as OrganizationsSchema from "./schemas/core/organizations";
import * as CurrenciesSchema from "./schemas/core/currencies";
import * as VatSchema from "./schemas/core/vat";
import * as MembershipsSchema from "./schemas/core/memberships";
import * as InvitationsSchema from "./schemas/core/invitations";
import * as PeriodsSchema from "./schemas/ledger/periods";
import * as AccountsSchema from "./schemas/ledger/accounts";
import * as SystemAccountsSchema from "./schemas/ledger/accounts-system";
import * as JournalEntriesSchema from "./schemas/ledger/journal_entries";
import * as PostingsSchema from "./schemas/ledger/postings";
import * as PeriodJournalSchema from "./schemas/ledger/period-journal";
import * as PostingManualVatPostingsSchema from "./schemas/ledger/posting-manual-vat-postings";
import * as UsersSchema from "./schemas/auth/users";
import * as SessionsSchema from "./schemas/auth/sessions";
import * as ApiKeysSchema from "./schemas/auth/api-keys";
import * as ClientsSchema from "./schemas/billing/clients";
import * as InvoicesSchema from "./schemas/billing/invoices";
import * as InvoiceJournalSchema from "./schemas/billing/invoice-journal";
import * as StatementsSchema from "./schemas/banking/statements";
import * as MovementsSchema from "./schemas/banking/movements";
import * as MovementJournalSchema from "./schemas/banking/movement-journal";
import * as AccountingSchema from "./schemas/core/accounting";
import * as BankSchema from "./schemas/core/bank";
import * as BillingSchema from "./schemas/core/billing";
import * as DocumentsSchema from "./schemas/core/documents";
import * as LlmUsagesSchema from "./schemas/metering/llm-usages";
import * as LlmReservationsSchema from "./schemas/metering/llm-reservations";
import * as ConversationsSchema from "./schemas/chat/conversations";
import * as MessagesSchema from "./schemas/chat/messages";
import * as MigrationsSchema from "./schemas/migration/migrations";
import * as DatasetsSchema from "./schemas/migration/datasets";

const RecordsSchema = {
  Auth: {
    UsersSchema,
    SessionsSchema,
    ApiKeysSchema,
  },
  Core: {
    OrganizationsSchema,
    MembershipsSchema,
    InvitationsSchema,
    VatSchema,
    CurrenciesSchema,
    AccountingSchema,
    BillingSchema,
    DocumentsSchema,
    BankSchema,
  },
  Ledger: {
    PeriodsSchema,
    AccountsSchema,
    SystemAccountsSchema,
    JournalEntriesSchema,
    PostingsSchema,
    PeriodJournalSchema,
    PostingManualVatPostingsSchema,
  },
  Billing: {
    ClientsSchema,
    InvoicesSchema,
    InvoiceJournalSchema,
  },
  Banking: {
    StatementsSchema,
    MovementsSchema,
    MovementJournalSchema,
  },
  Metering: {
    LlmUsagesSchema,
    LlmReservationsSchema,
  },
  Chat: {
    ConversationsSchema,
    MessagesSchema,
  },
  Migration: {
    MigrationsSchema,
    DatasetsSchema,
  },
};

export { RecordsSchema };
