CREATE SCHEMA "audit";

--> statement-breakpoint
CREATE SCHEMA "banking";

--> statement-breakpoint
CREATE SCHEMA "billing";

--> statement-breakpoint
CREATE SCHEMA "chat";

--> statement-breakpoint
CREATE SCHEMA "core";

--> statement-breakpoint
CREATE SCHEMA "ledger";

--> statement-breakpoint
CREATE SCHEMA "metering";

--> statement-breakpoint
CREATE SCHEMA "migration";

--> statement-breakpoint
CREATE SCHEMA "templates";

--> statement-breakpoint
CREATE TYPE "ledger"."account_type" AS ENUM(
  'asset',
  'liability',
  'equity',
  'income',
  'expense',
  'closing'
);

--> statement-breakpoint
CREATE TYPE "billing"."client_type" AS ENUM('company', 'individual');

--> statement-breakpoint
CREATE TYPE "core"."currency_type" AS ENUM('fiat', 'crypto');

--> statement-breakpoint
CREATE TYPE "core"."document_type" AS ENUM('invoice');

--> statement-breakpoint
CREATE TYPE "billing"."invoice_journal_entry_type" AS ENUM('open', 'payment', 'void', 'uncollectible');

--> statement-breakpoint
CREATE TYPE "billing"."invoice_status" AS ENUM('draft', 'open', 'paid', 'uncollectible', 'void');

--> statement-breakpoint
CREATE TYPE "core"."legal_form" AS ENUM('llc', 'corporation', 'sole_proprietorship');

--> statement-breakpoint
CREATE TYPE "billing"."line_type" AS ENUM('item', 'discount');

--> statement-breakpoint
CREATE TYPE "core"."membership_role" AS ENUM('admin', 'accountant', 'reviewer');

--> statement-breakpoint
CREATE TYPE "chat"."message_role" AS ENUM('user', 'assistant', 'tool');

--> statement-breakpoint
CREATE TYPE "migration"."migration_dataset_type" AS ENUM(
  'accounts',
  'clients',
  'balances',
  'journal',
  'invoices'
);

--> statement-breakpoint
CREATE TYPE "migration"."migration_provider" AS ENUM('bexio');

--> statement-breakpoint
CREATE TYPE "migration"."migration_status" AS ENUM('draft', 'succeeded', 'failed');

--> statement-breakpoint
CREATE TYPE "banking"."movement_status" AS ENUM('unreconciled', 'reconciled', 'ignored');

--> statement-breakpoint
CREATE TYPE "audit"."log_operation_type" AS ENUM('insert', 'update', 'delete');

--> statement-breakpoint
CREATE TYPE "ledger"."period_journal_entry_type" AS ENUM('opening', 'result');

--> statement-breakpoint
CREATE TYPE "ledger"."period_status" AS ENUM('open', 'closed');

--> statement-breakpoint
CREATE TYPE "ledger"."system_account_purpose" AS ENUM(
  'bank_account',
  'debtor',
  'creditor',
  'customer_credit_balance',
  'default_income',
  'default_expense',
  'income_reduction',
  'bad_debts',
  'expense_reduction',
  'vat_tax_due',
  'settlement_account_vat',
  'vat_remuneration_received',
  'regards_tax',
  'tax_pre_material',
  'tax_pre_investment',
  'transitory_tax_account_pre',
  'tax_pre_tax_cuts',
  'tax_pre_tax_correction',
  'rounding_differences',
  'exchange_rate_losses',
  'exchange_rate_gains',
  'profit_and_loss',
  'opening_balance_sheet',
  'closing_balance_sheet',
  'annual_profit',
  'annual_result',
  'correction',
  'balance_takeover',
  'capital',
  'capital_contributions',
  'private_account'
);

--> statement-breakpoint
CREATE TYPE "core"."vat_payment_method" AS ENUM('net_rate', 'effective');

--> statement-breakpoint
CREATE TYPE "core"."vat_period_status" AS ENUM('open', 'closed');

--> statement-breakpoint
CREATE TYPE "core"."vat_remuneration_method" AS ENUM('agreed', 'received');

--> statement-breakpoint
CREATE TYPE "core"."vat_type" AS ENUM(
  'net_rate_tax',
  'acquisition_tax_investments',
  'acquisition_tax_materials',
  'non_consideration',
  'non_taxable_turnover',
  'import_tax_materials',
  'import_tax_investments',
  'sales_tax_due',
  'input_tax_materials',
  'input_tax_investments'
);

--> statement-breakpoint
CREATE ROLE "authenticated_user";

--> statement-breakpoint
CREATE TABLE "core"."accounting_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "base_currency" varchar(20) DEFAULT 'CHF' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "core"."accounting_settings" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "ledger"."accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "parent_id" uuid,
  "organization_id" uuid NOT NULL,
  "name" text,
  "code" text NOT NULL,
  "type" "ledger"."account_type" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "ledger"."accounts" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "core"."bank_relations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "name" text NOT NULL,
  "iban" text NOT NULL,
  "invoice_iban" text,
  "currency" varchar(20) NOT NULL,
  "account_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "bank_relations_iban_format" CHECK ("iban" ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'),
  CONSTRAINT "bank_relations_invoice_iban_format" CHECK (
    "invoice_iban" ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'
  )
);

--> statement-breakpoint
ALTER TABLE "core"."bank_relations" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "core"."billing_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "payment_term_days" integer DEFAULT 30 NOT NULL,
  "vat_rate_id" uuid,
  "bank_relation_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "billing_settings_payment_term_days_non_negative" CHECK ("payment_term_days" >= 0)
);

--> statement-breakpoint
ALTER TABLE "core"."billing_settings" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "billing"."clients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "type" "billing"."client_type" DEFAULT 'company'::"billing"."client_type" NOT NULL,
  "name" text NOT NULL,
  "care_of" text,
  "address" text,
  "postal_code" text,
  "city" text,
  "country" varchar(2),
  "language" varchar(2),
  "email" text,
  "phone" text,
  "website" text,
  "vat_number" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "clients_vat_number_format" CHECK (
    "vat_number" ~ '^CHE-\d{3}\.\d{3}\.\d{3} (MWST|TVA|IVA)$'
  ),
  CONSTRAINT "clients_name_not_blank" CHECK (btrim("name") <> '')
);

--> statement-breakpoint
ALTER TABLE "billing"."clients" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "billing"."contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "last_name" text NOT NULL,
  "first_name" text,
  "email" text,
  "phone" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "billing"."contacts" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "chat"."conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "organization_id" uuid,
  "title" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "chat"."conversations" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "core"."currencies" (
  "code" varchar(20) PRIMARY KEY,
  "type" "core"."currency_type" DEFAULT 'fiat'::"core"."currency_type" NOT NULL,
  "decimals" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
CREATE TABLE "migration"."datasets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "migration_id" uuid NOT NULL,
  "type" "migration"."migration_dataset_type" NOT NULL,
  "name" text NOT NULL,
  "data" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "migration"."datasets" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "core"."document_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "type" "core"."document_type" NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "core"."document_templates" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "core"."invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "email" text NOT NULL,
  "role" "core"."membership_role" NOT NULL,
  "token_hash" char(64) NOT NULL,
  "expires_at" timestamp with time zone DEFAULT now() + interval '7 days' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "invitations_token_hash_format" CHECK ("token_hash" ~ '^[0-9a-f]{64}$')
);

--> statement-breakpoint
ALTER TABLE "core"."invitations" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "billing"."invoice_journal_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "invoice_id" uuid NOT NULL,
  "journal_entry_id" uuid NOT NULL,
  "type" "billing"."invoice_journal_entry_type" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "billing"."invoice_journal_entries" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "billing"."invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "status" "billing"."invoice_status" DEFAULT 'draft'::"billing"."invoice_status" NOT NULL,
  "number" integer,
  "payment_reference" text,
  "issue_on" date NOT NULL,
  "due_on" date,
  "vat_rate_id" uuid,
  "currency" varchar(20) NOT NULL,
  "exchange_rate" numeric(20, 10) DEFAULT '1' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "invoices_number_unless_draft" CHECK (("status" = 'draft') = ("number" IS NULL)),
  CONSTRAINT "invoices_payment_reference_unless_draft" CHECK (
    ("status" = 'draft') = ("payment_reference" IS NULL)
  ),
  CONSTRAINT "invoices_payment_reference_format" CHECK ("payment_reference" ~ '^[0-9]{20}$')
);

--> statement-breakpoint
ALTER TABLE "billing"."invoices" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "ledger"."journal_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "number" integer DEFAULT 0 NOT NULL,
  "valid_on" date NOT NULL,
  "reference" text,
  "migrated" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "journal_entries_number_positive" CHECK ("number" > 0)
);

--> statement-breakpoint
ALTER TABLE "ledger"."journal_entries" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "templates"."ledger_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "parent_id" uuid,
  "legal_form" "core"."legal_form" NOT NULL,
  "purpose" "ledger"."system_account_purpose",
  "code" text NOT NULL,
  "type" "ledger"."account_type" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "templates"."ledger_accounts" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "billing"."lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "invoice_id" uuid NOT NULL,
  "type" "billing"."line_type" NOT NULL,
  "description" text NOT NULL,
  "quantity" numeric(10, 3) NOT NULL,
  "unit_price" numeric(78, 0) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "lines_quantity_non_negative" CHECK ("quantity" >= 0),
  CONSTRAINT "lines_unit_price_non_negative" CHECK ("unit_price" >= 0)
);

--> statement-breakpoint
ALTER TABLE "billing"."lines" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "metering"."llm_reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "reserved_tokens" bigint NOT NULL,
  "expires_at" timestamp with time zone NOT NULL
);

--> statement-breakpoint
ALTER TABLE "metering"."llm_reservations" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "metering"."llm_usages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text,
  "organization_id" uuid,
  "conversation_id" uuid,
  "model" text NOT NULL,
  "input_tokens" bigint NOT NULL,
  "output_tokens" bigint NOT NULL,
  "logged_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "metering"."llm_usages" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "audit"."logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "table_schema" text NOT NULL,
  "table_name" text NOT NULL,
  "record_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "operation" "audit"."log_operation_type" NOT NULL,
  "old_data" jsonb,
  "new_data" jsonb,
  "user_id" text,
  "logged_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "core"."memberships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "organization_id" uuid NOT NULL,
  "role" "core"."membership_role" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "core"."memberships" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "chat"."messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL,
  "position" integer NOT NULL,
  "role" "chat"."message_role" NOT NULL,
  "content" text,
  "tool_calls" jsonb,
  "tool_call_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "chat"."messages" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "migration"."migrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "user_id" text,
  "provider" "migration"."migration_provider" NOT NULL,
  "status" "migration"."migration_status" DEFAULT 'draft'::"migration"."migration_status" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "migration"."migrations" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "banking"."movement_journal_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "movement_id" uuid NOT NULL,
  "journal_entry_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "banking"."movement_journal_entries" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "banking"."movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "bank_relation_id" uuid NOT NULL,
  "statement_id" uuid NOT NULL,
  "bank_reference" text,
  "dedupe_hash" char(64) NOT NULL,
  "booked_on" date NOT NULL,
  "value_on" date,
  "amount" numeric(78, 0) NOT NULL,
  "currency" varchar(20) NOT NULL,
  "counterparty_name" text,
  "counterparty_address" text,
  "counterparty_iban" text,
  "creditor_reference" text,
  "communication" text,
  "description" text,
  "foreign_amount" numeric(78, 0),
  "foreign_currency" varchar(20),
  "bank_fees_amount" numeric(78, 0),
  "bank_fees_currency" varchar(20),
  "status" "banking"."movement_status" DEFAULT 'unreconciled'::"banking"."movement_status" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "movements_amount_not_zero" CHECK ("amount" <> 0),
  CONSTRAINT "movements_dedupe_hash_format" CHECK ("dedupe_hash" ~ '^[0-9a-f]{64}$')
);

--> statement-breakpoint
ALTER TABLE "banking"."movements" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "core"."organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "legal_form" "core"."legal_form" NOT NULL,
  "care_of" text,
  "address" text,
  "postal_code" text,
  "city" text,
  "country" varchar(2),
  "language" varchar(2),
  "email" text,
  "phone" text,
  "website" text,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "organizations_name_not_blank" CHECK (btrim("name") <> '')
);

--> statement-breakpoint
ALTER TABLE "core"."organizations" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "ledger"."period_journal_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "period_id" uuid NOT NULL,
  "journal_entry_id" uuid NOT NULL,
  "type" "ledger"."period_journal_entry_type" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "ledger"."period_journal_entries" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "ledger"."periods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "start_on" date NOT NULL,
  "end_on" date NOT NULL,
  "status" "ledger"."period_status" DEFAULT 'open'::"ledger"."period_status" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "periods_end_after_start" CHECK ("end_on" >= "start_on")
);

--> statement-breakpoint
ALTER TABLE "ledger"."periods" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "ledger"."posting_manual_vat_postings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "posting_id" uuid NOT NULL,
  "vat_posting_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "ledger"."posting_manual_vat_postings" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "ledger"."postings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "journal_entry_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "description" text,
  "debit" numeric(78, 0) DEFAULT '0' NOT NULL,
  "credit" numeric(78, 0) DEFAULT '0' NOT NULL,
  "vat_rate_id" uuid,
  "currency" varchar(20) NOT NULL,
  "exchange_rate" numeric(20, 10) DEFAULT '1' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "debit_or_credit_not_both" CHECK (
    NOT (
      "debit" > 0
      AND "credit" > 0
    )
  ),
  CONSTRAINT "debit_or_credit_one_positive" CHECK (
    ("debit" > 0)
    OR ("credit" > 0)
  )
);

--> statement-breakpoint
ALTER TABLE "ledger"."postings" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "banking"."statements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "bank_relation_id" uuid NOT NULL,
  "bank_message_id" text NOT NULL,
  "bank_statement_id" text NOT NULL,
  "start_on" date NOT NULL,
  "end_on" date NOT NULL,
  "opening_balance" numeric(78, 0) NOT NULL,
  "closing_balance" numeric(78, 0) NOT NULL,
  "currency" varchar(20) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "statements_period" CHECK ("start_on" <= "end_on")
);

--> statement-breakpoint
ALTER TABLE "banking"."statements" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "ledger"."system_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "purpose" "ledger"."system_account_purpose" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "ledger"."system_accounts" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "core"."template_contents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "template_id" uuid NOT NULL,
  "language" varchar(2) NOT NULL,
  "html" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "template_contents_html_max_length" CHECK (char_length("html") <= 262144)
);

--> statement-breakpoint
ALTER TABLE "core"."template_contents" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "core"."vat_methods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "period_id" uuid NOT NULL,
  "remuneration_method" "core"."vat_remuneration_method" NOT NULL,
  "payment_method" "core"."vat_payment_method" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "core"."vat_methods" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "core"."vat_periods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "start_on" date NOT NULL,
  "end_on" date NOT NULL,
  "status" "core"."vat_period_status" DEFAULT 'open'::"core"."vat_period_status" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "vat_periods_end_after_start" CHECK ("end_on" >= "start_on")
);

--> statement-breakpoint
ALTER TABLE "core"."vat_periods" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "core"."vat_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "code" text NOT NULL,
  "type" "core"."vat_type" NOT NULL,
  "rate" numeric(6, 3) NOT NULL,
  "net_rate" numeric(6, 3),
  "start_on" date NOT NULL,
  "end_on" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "net_rate_required_for_net_rate_tax" CHECK (
    (
      "type" = 'net_rate_tax'
      AND "net_rate" IS NOT NULL
    )
    OR (
      "type" != 'net_rate_tax'
      AND "net_rate" IS NULL
    )
  )
);

--> statement-breakpoint
ALTER TABLE "core"."vat_rates" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "templates"."vat_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL,
  "type" "core"."vat_type" NOT NULL,
  "payment_method" "core"."vat_payment_method",
  "rate" numeric(6, 3) NOT NULL,
  "start_on" date NOT NULL,
  "end_on" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "vat_rates_templates_payment_method" CHECK (
    CASE "type"
      WHEN 'net_rate_tax' THEN false
      WHEN 'sales_tax_due' THEN COALESCE("payment_method" = 'effective', false)
      WHEN 'input_tax_materials' THEN COALESCE("payment_method" = 'effective', false)
      WHEN 'input_tax_investments' THEN COALESCE("payment_method" = 'effective', false)
      WHEN 'import_tax_materials' THEN COALESCE("payment_method" = 'effective', false)
      WHEN 'import_tax_investments' THEN COALESCE("payment_method" = 'effective', false)
      ELSE "payment_method" IS NULL
    END
  )
);

--> statement-breakpoint
ALTER TABLE "templates"."vat_rates" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "core"."vat_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "vat_number" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "vat_settings_vat_number_format" CHECK (
    "vat_number" ~ '^CHE-\d{3}\.\d{3}\.\d{3} (MWST|TVA|IVA)$'
  )
);

--> statement-breakpoint
ALTER TABLE "core"."vat_settings" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "auth"."accounts" (
  "id" text PRIMARY KEY,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "password" text,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

--> statement-breakpoint
CREATE TABLE "auth"."apikeys" (
  "id" text PRIMARY KEY,
  "config_id" text DEFAULT 'default' NOT NULL,
  "name" text,
  "start" text,
  "reference_id" text NOT NULL,
  "prefix" text,
  "key" text NOT NULL,
  "refill_interval" integer,
  "refill_amount" integer,
  "last_refill_at" timestamp,
  "enabled" boolean DEFAULT true,
  "rate_limit_enabled" boolean DEFAULT true,
  "rate_limit_time_window" integer DEFAULT 60000,
  "rate_limit_max" integer DEFAULT 120,
  "request_count" integer DEFAULT 0,
  "remaining" integer,
  "last_request" timestamp,
  "expires_at" timestamp,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  "permissions" text,
  "metadata" text
);

--> statement-breakpoint
CREATE TABLE "auth"."sessions" (
  "id" text PRIMARY KEY,
  "expires_at" timestamp NOT NULL,
  "token" text NOT NULL UNIQUE,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL
);

--> statement-breakpoint
CREATE TABLE "auth"."two_factors" (
  "id" text PRIMARY KEY,
  "secret" text NOT NULL,
  "backup_codes" text NOT NULL,
  "user_id" text NOT NULL,
  "verified" boolean DEFAULT true,
  "failed_verification_count" integer DEFAULT 0,
  "locked_until" timestamp
);

--> statement-breakpoint
CREATE TABLE "auth"."users" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" text,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  "two_factor_enabled" boolean DEFAULT false
);

--> statement-breakpoint
CREATE TABLE "auth"."verifications" (
  "id" text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_settings_org_uidx" ON "core"."accounting_settings" ("organization_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_org_code_uidx" ON "ledger"."accounts" ("organization_id", "code");

--> statement-breakpoint
CREATE UNIQUE INDEX "bank_relations_org_iban_uidx" ON "core"."bank_relations" ("organization_id", "iban");

--> statement-breakpoint
CREATE UNIQUE INDEX "bank_relations_org_invoice_iban_uidx" ON "core"."bank_relations" ("organization_id", "invoice_iban");

--> statement-breakpoint
CREATE UNIQUE INDEX "billing_settings_org_uidx" ON "core"."billing_settings" ("organization_id");

--> statement-breakpoint
CREATE INDEX "conversations_user_updated_at_idx" ON "chat"."conversations" ("user_id", "updated_at");

--> statement-breakpoint
CREATE INDEX "datasets_migration_id_idx" ON "migration"."datasets" ("migration_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "datasets_migration_type_uidx" ON "migration"."datasets" ("migration_id", "type")
WHERE
  "type" <> 'journal';

--> statement-breakpoint
CREATE UNIQUE INDEX "document_templates_org_type_name_uq" ON "core"."document_templates" ("organization_id", "type", "name");

--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_org_email_uidx" ON "core"."invitations" ("organization_id", lower("email"));

--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_hash_uidx" ON "core"."invitations" ("token_hash");

--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_journal_entries_journal_entry_id_uidx" ON "billing"."invoice_journal_entries" ("journal_entry_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_journal_entries_invoice_open_uidx" ON "billing"."invoice_journal_entries" ("invoice_id")
WHERE
  "type" = 'open';

--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_client_number_uidx" ON "billing"."invoices" ("client_id", "number");

--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_organization_payment_reference_uidx" ON "billing"."invoices" ("organization_id", "payment_reference");

--> statement-breakpoint
CREATE INDEX "journal_entries_valid_on_idx" ON "ledger"."journal_entries" ("organization_id", "valid_on");

--> statement-breakpoint
CREATE UNIQUE INDEX "journal_entries_org_number_uidx" ON "ledger"."journal_entries" ("organization_id", "number");

--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_accounts_templates_legal_form_purpose_uidx" ON "templates"."ledger_accounts" ("legal_form", "purpose")
WHERE
  "purpose" IS NOT NULL;

--> statement-breakpoint
CREATE INDEX "llm_reservations_user_expires_at_idx" ON "metering"."llm_reservations" ("user_id", "expires_at");

--> statement-breakpoint
CREATE INDEX "llm_usages_user_logged_at_idx" ON "metering"."llm_usages" ("user_id", "logged_at");

--> statement-breakpoint
CREATE INDEX "logs_organization_id_idx" ON "audit"."logs" ("organization_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_org_uidx" ON "core"."memberships" ("user_id", "organization_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "messages_conversation_position_uidx" ON "chat"."messages" ("conversation_id", "position");

--> statement-breakpoint
CREATE INDEX "migrations_organization_id_idx" ON "migration"."migrations" ("organization_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "movement_journal_entries_movement_entry_uidx" ON "banking"."movement_journal_entries" ("movement_id", "journal_entry_id");

--> statement-breakpoint
CREATE INDEX "movement_journal_entries_journal_entry_idx" ON "banking"."movement_journal_entries" ("journal_entry_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "movements_bank_relation_dedupe_hash_uidx" ON "banking"."movements" ("bank_relation_id", "dedupe_hash");

--> statement-breakpoint
CREATE INDEX "movements_bank_relation_status_idx" ON "banking"."movements" ("bank_relation_id", "status");

--> statement-breakpoint
CREATE INDEX "movements_bank_relation_booked_on_idx" ON "banking"."movements" ("bank_relation_id", "booked_on");

--> statement-breakpoint
CREATE UNIQUE INDEX "period_journal_entries_journal_entry_id_uidx" ON "ledger"."period_journal_entries" ("journal_entry_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "period_journal_entries_period_type_uidx" ON "ledger"."period_journal_entries" ("period_id", "type");

--> statement-breakpoint
CREATE UNIQUE INDEX "periods_org_start_uq" ON "ledger"."periods" ("organization_id", "start_on");

--> statement-breakpoint
CREATE UNIQUE INDEX "posting_manual_vat_postings_vat_posting_id_uidx" ON "ledger"."posting_manual_vat_postings" ("vat_posting_id");

--> statement-breakpoint
CREATE INDEX "posting_manual_vat_postings_posting_id_idx" ON "ledger"."posting_manual_vat_postings" ("posting_id");

--> statement-breakpoint
CREATE INDEX "postings_journal_entry_account_idx" ON "ledger"."postings" ("account_id", "journal_entry_id");

--> statement-breakpoint
CREATE INDEX "postings_journal_entry_idx" ON "ledger"."postings" ("journal_entry_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "statements_bank_relation_bank_statement_uidx" ON "banking"."statements" ("bank_relation_id", "bank_statement_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "system_accounts_org_purpose_uidx" ON "ledger"."system_accounts" ("organization_id", "purpose");

--> statement-breakpoint
CREATE UNIQUE INDEX "system_accounts_org_account_uidx" ON "ledger"."system_accounts" ("organization_id", "account_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "template_contents_template_language_uq" ON "core"."template_contents" ("template_id", "language");

--> statement-breakpoint
CREATE UNIQUE INDEX "vat_methods_period_uidx" ON "core"."vat_methods" ("period_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "vat_periods_org_start_uidx" ON "core"."vat_periods" ("organization_id", "start_on");

--> statement-breakpoint
CREATE UNIQUE INDEX "vat_rates_templates_code_start_uidx" ON "templates"."vat_rates" ("code", "start_on");

--> statement-breakpoint
CREATE UNIQUE INDEX "vat_settings_org_uidx" ON "core"."vat_settings" ("organization_id");

--> statement-breakpoint
CREATE INDEX "accounts_userId_idx" ON "auth"."accounts" ("user_id");

--> statement-breakpoint
CREATE INDEX "apikeys_configId_idx" ON "auth"."apikeys" ("config_id");

--> statement-breakpoint
CREATE INDEX "apikeys_referenceId_idx" ON "auth"."apikeys" ("reference_id");

--> statement-breakpoint
CREATE INDEX "apikeys_key_idx" ON "auth"."apikeys" ("key");

--> statement-breakpoint
CREATE INDEX "sessions_userId_idx" ON "auth"."sessions" ("user_id");

--> statement-breakpoint
CREATE INDEX "twoFactors_secret_idx" ON "auth"."two_factors" ("secret");

--> statement-breakpoint
CREATE INDEX "twoFactors_userId_idx" ON "auth"."two_factors" ("user_id");

--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "auth"."verifications" ("identifier");

--> statement-breakpoint
ALTER TABLE "core"."accounting_settings"
ADD CONSTRAINT "accounting_settings_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "core"."accounting_settings"
ADD CONSTRAINT "accounting_settings_base_currency_currencies_code_fkey" FOREIGN KEY ("base_currency") REFERENCES "core"."currencies" ("code");

--> statement-breakpoint
ALTER TABLE "ledger"."accounts"
ADD CONSTRAINT "accounts_parent_id_accounts_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "ledger"."accounts" ("id");

--> statement-breakpoint
ALTER TABLE "ledger"."accounts"
ADD CONSTRAINT "accounts_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "core"."bank_relations"
ADD CONSTRAINT "bank_relations_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "core"."bank_relations"
ADD CONSTRAINT "bank_relations_currency_currencies_code_fkey" FOREIGN KEY ("currency") REFERENCES "core"."currencies" ("code");

--> statement-breakpoint
ALTER TABLE "core"."bank_relations"
ADD CONSTRAINT "bank_relations_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ledger"."accounts" ("id");

--> statement-breakpoint
ALTER TABLE "core"."billing_settings"
ADD CONSTRAINT "billing_settings_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "core"."billing_settings"
ADD CONSTRAINT "billing_settings_vat_rate_id_vat_rates_id_fkey" FOREIGN KEY ("vat_rate_id") REFERENCES "core"."vat_rates" ("id");

--> statement-breakpoint
ALTER TABLE "core"."billing_settings"
ADD CONSTRAINT "billing_settings_bank_relation_id_bank_relations_id_fkey" FOREIGN KEY ("bank_relation_id") REFERENCES "core"."bank_relations" ("id");

--> statement-breakpoint
ALTER TABLE "billing"."clients"
ADD CONSTRAINT "clients_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "billing"."contacts"
ADD CONSTRAINT "contacts_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "billing"."contacts"
ADD CONSTRAINT "contacts_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "billing"."clients" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "chat"."conversations"
ADD CONSTRAINT "conversations_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "chat"."conversations"
ADD CONSTRAINT "conversations_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "migration"."datasets"
ADD CONSTRAINT "datasets_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "migration"."datasets"
ADD CONSTRAINT "datasets_migration_id_migrations_id_fkey" FOREIGN KEY ("migration_id") REFERENCES "migration"."migrations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "core"."document_templates"
ADD CONSTRAINT "document_templates_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "core"."invitations"
ADD CONSTRAINT "invitations_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "billing"."invoice_journal_entries"
ADD CONSTRAINT "invoice_journal_entries_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "billing"."invoice_journal_entries"
ADD CONSTRAINT "invoice_journal_entries_invoice_id_invoices_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing"."invoices" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "billing"."invoice_journal_entries"
ADD CONSTRAINT "invoice_journal_entries_2noWbSmzk3Rq_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "ledger"."journal_entries" ("id");

--> statement-breakpoint
ALTER TABLE "billing"."invoices"
ADD CONSTRAINT "invoices_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "billing"."invoices"
ADD CONSTRAINT "invoices_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "billing"."clients" ("id");

--> statement-breakpoint
ALTER TABLE "billing"."invoices"
ADD CONSTRAINT "invoices_vat_rate_id_vat_rates_id_fkey" FOREIGN KEY ("vat_rate_id") REFERENCES "core"."vat_rates" ("id");

--> statement-breakpoint
ALTER TABLE "billing"."invoices"
ADD CONSTRAINT "invoices_currency_currencies_code_fkey" FOREIGN KEY ("currency") REFERENCES "core"."currencies" ("code");

--> statement-breakpoint
ALTER TABLE "ledger"."journal_entries"
ADD CONSTRAINT "journal_entries_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "templates"."ledger_accounts"
ADD CONSTRAINT "ledger_accounts_parent_id_ledger_accounts_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "templates"."ledger_accounts" ("id");

--> statement-breakpoint
ALTER TABLE "billing"."lines"
ADD CONSTRAINT "lines_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "billing"."lines"
ADD CONSTRAINT "lines_invoice_id_invoices_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing"."invoices" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "metering"."llm_reservations"
ADD CONSTRAINT "llm_reservations_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "metering"."llm_usages"
ADD CONSTRAINT "llm_usages_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id") ON DELETE SET NULL;

--> statement-breakpoint
ALTER TABLE "metering"."llm_usages"
ADD CONSTRAINT "llm_usages_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE SET NULL;

--> statement-breakpoint
ALTER TABLE "metering"."llm_usages"
ADD CONSTRAINT "llm_usages_conversation_id_conversations_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat"."conversations" ("id") ON DELETE SET NULL;

--> statement-breakpoint
ALTER TABLE "core"."memberships"
ADD CONSTRAINT "memberships_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "core"."memberships"
ADD CONSTRAINT "memberships_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "chat"."messages"
ADD CONSTRAINT "messages_conversation_id_conversations_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat"."conversations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "migration"."migrations"
ADD CONSTRAINT "migrations_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "migration"."migrations"
ADD CONSTRAINT "migrations_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id") ON DELETE SET NULL;

--> statement-breakpoint
ALTER TABLE "banking"."movement_journal_entries"
ADD CONSTRAINT "movement_journal_entries_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "banking"."movement_journal_entries"
ADD CONSTRAINT "movement_journal_entries_movement_id_movements_id_fkey" FOREIGN KEY ("movement_id") REFERENCES "banking"."movements" ("id");

--> statement-breakpoint
ALTER TABLE "banking"."movement_journal_entries"
ADD CONSTRAINT "movement_journal_entries_20jKexMdUz2q_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "ledger"."journal_entries" ("id");

--> statement-breakpoint
ALTER TABLE "banking"."movements"
ADD CONSTRAINT "movements_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "banking"."movements"
ADD CONSTRAINT "movements_bank_relation_id_bank_relations_id_fkey" FOREIGN KEY ("bank_relation_id") REFERENCES "core"."bank_relations" ("id");

--> statement-breakpoint
ALTER TABLE "banking"."movements"
ADD CONSTRAINT "movements_statement_id_statements_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "banking"."statements" ("id");

--> statement-breakpoint
ALTER TABLE "banking"."movements"
ADD CONSTRAINT "movements_currency_currencies_code_fkey" FOREIGN KEY ("currency") REFERENCES "core"."currencies" ("code");

--> statement-breakpoint
ALTER TABLE "banking"."movements"
ADD CONSTRAINT "movements_foreign_currency_currencies_code_fkey" FOREIGN KEY ("foreign_currency") REFERENCES "core"."currencies" ("code");

--> statement-breakpoint
ALTER TABLE "banking"."movements"
ADD CONSTRAINT "movements_bank_fees_currency_currencies_code_fkey" FOREIGN KEY ("bank_fees_currency") REFERENCES "core"."currencies" ("code");

--> statement-breakpoint
ALTER TABLE "ledger"."period_journal_entries"
ADD CONSTRAINT "period_journal_entries_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "ledger"."period_journal_entries"
ADD CONSTRAINT "period_journal_entries_period_id_periods_id_fkey" FOREIGN KEY ("period_id") REFERENCES "ledger"."periods" ("id");

--> statement-breakpoint
ALTER TABLE "ledger"."period_journal_entries"
ADD CONSTRAINT "period_journal_entries_journal_entry_id_journal_entries_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "ledger"."journal_entries" ("id");

--> statement-breakpoint
ALTER TABLE "ledger"."periods"
ADD CONSTRAINT "periods_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "ledger"."posting_manual_vat_postings"
ADD CONSTRAINT "posting_manual_vat_postings_0mQABIJSoc4y_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "ledger"."posting_manual_vat_postings"
ADD CONSTRAINT "posting_manual_vat_postings_posting_id_postings_id_fkey" FOREIGN KEY ("posting_id") REFERENCES "ledger"."postings" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "ledger"."posting_manual_vat_postings"
ADD CONSTRAINT "posting_manual_vat_postings_vat_posting_id_postings_id_fkey" FOREIGN KEY ("vat_posting_id") REFERENCES "ledger"."postings" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "ledger"."postings"
ADD CONSTRAINT "postings_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "ledger"."postings"
ADD CONSTRAINT "postings_journal_entry_id_journal_entries_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "ledger"."journal_entries" ("id");

--> statement-breakpoint
ALTER TABLE "ledger"."postings"
ADD CONSTRAINT "postings_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ledger"."accounts" ("id");

--> statement-breakpoint
ALTER TABLE "ledger"."postings"
ADD CONSTRAINT "postings_vat_rate_id_vat_rates_id_fkey" FOREIGN KEY ("vat_rate_id") REFERENCES "core"."vat_rates" ("id");

--> statement-breakpoint
ALTER TABLE "ledger"."postings"
ADD CONSTRAINT "postings_currency_currencies_code_fkey" FOREIGN KEY ("currency") REFERENCES "core"."currencies" ("code");

--> statement-breakpoint
ALTER TABLE "banking"."statements"
ADD CONSTRAINT "statements_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "banking"."statements"
ADD CONSTRAINT "statements_bank_relation_id_bank_relations_id_fkey" FOREIGN KEY ("bank_relation_id") REFERENCES "core"."bank_relations" ("id");

--> statement-breakpoint
ALTER TABLE "banking"."statements"
ADD CONSTRAINT "statements_currency_currencies_code_fkey" FOREIGN KEY ("currency") REFERENCES "core"."currencies" ("code");

--> statement-breakpoint
ALTER TABLE "ledger"."system_accounts"
ADD CONSTRAINT "system_accounts_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "ledger"."system_accounts"
ADD CONSTRAINT "system_accounts_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ledger"."accounts" ("id");

--> statement-breakpoint
ALTER TABLE "core"."template_contents"
ADD CONSTRAINT "template_contents_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "core"."template_contents"
ADD CONSTRAINT "template_contents_template_id_document_templates_id_fkey" FOREIGN KEY ("template_id") REFERENCES "core"."document_templates" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "core"."vat_methods"
ADD CONSTRAINT "vat_methods_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "core"."vat_methods"
ADD CONSTRAINT "vat_methods_period_id_periods_id_fkey" FOREIGN KEY ("period_id") REFERENCES "ledger"."periods" ("id");

--> statement-breakpoint
ALTER TABLE "core"."vat_periods"
ADD CONSTRAINT "vat_periods_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "core"."vat_rates"
ADD CONSTRAINT "vat_rates_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "core"."vat_settings"
ADD CONSTRAINT "vat_settings_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "auth"."accounts"
ADD CONSTRAINT "accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "auth"."sessions"
ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "auth"."two_factors"
ADD CONSTRAINT "two_factors_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id") ON DELETE CASCADE;

--> statement-breakpoint
CREATE MATERIALIZED VIEW "ledger"."mv_account_balances" AS (
  WITH RECURSIVE
    account_closure AS (
      -- Base case: Every account maps to itself
      SELECT
        "ledger"."accounts"."id" AS account_id,
        "ledger"."accounts"."id" AS ancestor_id,
        "ledger"."accounts"."organization_id" AS organization_id
      FROM
        "ledger"."accounts"
      UNION ALL
      -- Recursive step: Step up the tree using parent_id
      SELECT
        child.account_id,
        curr."parent_id" AS ancestor_id,
        child.organization_id
      FROM
        account_closure child
        JOIN "ledger"."accounts" curr ON curr."id" = child.ancestor_id
      WHERE
        curr."parent_id" IS NOT NULL
    ),
    posting_periods AS (
      (
        select
          "ledger"."postings"."account_id",
          "ledger"."periods"."id" as "period_id",
          "ledger"."postings"."debit",
          "ledger"."postings"."credit",
          "ledger"."postings"."exchange_rate",
          "base_currencies"."decimals" - "core"."currencies"."decimals" as "decimals_shift"
        from
          "ledger"."postings"
          inner join "ledger"."journal_entries" on "ledger"."journal_entries"."id" = "ledger"."postings"."journal_entry_id"
          inner join "core"."currencies" on "core"."currencies"."code" = "ledger"."postings"."currency"
          inner join "core"."accounting_settings" on "core"."accounting_settings"."organization_id" = "ledger"."journal_entries"."organization_id"
          inner join "core"."currencies" "base_currencies" on "base_currencies"."code" = "core"."accounting_settings"."base_currency"
          inner join "ledger"."periods" on (
            (
              "ledger"."periods"."organization_id" = "ledger"."journal_entries"."organization_id"
            )
            and (
              "ledger"."journal_entries"."valid_on" between "ledger"."periods"."start_on" and "ledger"."periods"."end_on"
            )
          )
      )
    ),
    account_balances_cte AS (
      (
        select
          "ledger"."accounts"."organization_id",
          "ledger"."periods"."id" as "period_id",
          "ledger"."accounts"."id" as "account_id",
          "ledger"."accounts"."parent_id",
          "ledger"."accounts"."code",
          "ledger"."accounts"."name",
          "ledger"."accounts"."type",
          (
            COALESCE(
              SUM(
                ROUND(
                  posting_periods.debit * posting_periods.exchange_rate * power(10::numeric, posting_periods.decimals_shift)
                )
              ),
              0
            )
          )::numeric(78, 0) as "total_debit",
          (
            COALESCE(
              SUM(
                ROUND(
                  posting_periods.credit * posting_periods.exchange_rate * power(10::numeric, posting_periods.decimals_shift)
                )
              ),
              0
            )
          )::numeric(78, 0) as "total_credit",
          (
            CASE
              WHEN "ledger"."accounts"."type" = 'asset'
              OR "ledger"."accounts"."type" = 'expense' THEN COALESCE(
                SUM(
                  ROUND(
                    posting_periods.debit * posting_periods.exchange_rate * power(10::numeric, posting_periods.decimals_shift)
                  )
                ),
                0
              ) - COALESCE(
                SUM(
                  ROUND(
                    posting_periods.credit * posting_periods.exchange_rate * power(10::numeric, posting_periods.decimals_shift)
                  )
                ),
                0
              )
              ELSE COALESCE(
                SUM(
                  ROUND(
                    posting_periods.credit * posting_periods.exchange_rate * power(10::numeric, posting_periods.decimals_shift)
                  )
                ),
                0
              ) - COALESCE(
                SUM(
                  ROUND(
                    posting_periods.debit * posting_periods.exchange_rate * power(10::numeric, posting_periods.decimals_shift)
                  )
                ),
                0
              )
            END
          )::numeric(78, 0) as "balance",
          now() as "computed_at"
        from
          "ledger"."accounts"
          inner join "ledger"."periods" on "ledger"."periods"."organization_id" = "ledger"."accounts"."organization_id"
          left join account_closure on (
            (
              account_closure.ancestor_id = "ledger"."accounts"."id"
            )
            and (
              account_closure.organization_id = "ledger"."accounts"."organization_id"
            )
          )
          left join posting_periods on (
            (
              posting_periods.account_id = account_closure.account_id
            )
            and (
              posting_periods.period_id = "ledger"."periods"."id"
            )
          )
        group by
          "ledger"."accounts"."organization_id",
          "ledger"."accounts"."id",
          "ledger"."accounts"."parent_id",
          "ledger"."accounts"."code",
          "ledger"."accounts"."name",
          "ledger"."accounts"."type",
          "ledger"."periods"."id"
        having
          COALESCE(
            SUM(
              ROUND(
                posting_periods.debit * posting_periods.exchange_rate * power(10::numeric, posting_periods.decimals_shift)
              )
            ),
            0
          ) != 0
          OR COALESCE(
            SUM(
              ROUND(
                posting_periods.credit * posting_periods.exchange_rate * power(10::numeric, posting_periods.decimals_shift)
              )
            ),
            0
          ) != 0
      )
    )
  SELECT
    *
  FROM
    account_balances_cte
);

--> statement-breakpoint
CREATE VIEW "ledger"."account_balances"
WITH
  (security_barrier = true) AS (
    select
      "organization_id",
      "period_id",
      "account_id",
      "parent_id",
      "code",
      "name",
      "type",
      "total_debit",
      "total_credit",
      "balance",
      "computed_at"
    from
      "ledger"."mv_account_balances"
    where
      "mv_account_balances"."organization_id" IN (
        SELECT
          organization_id
        FROM
          core.memberships
        WHERE
          user_id = auth.current_user_id ()
      )
    order by
      "mv_account_balances"."code"
  );

--> statement-breakpoint
CREATE VIEW "ledger"."balance_sheet"
WITH
  (security_barrier = true) AS (
    select
      "organization_id",
      "period_id",
      "account_id",
      "parent_id",
      "code",
      "name",
      "type",
      "total_debit",
      "total_credit",
      "balance",
      "computed_at"
    from
      "ledger"."mv_account_balances"
    where
      (
        (
          "mv_account_balances"."organization_id" IN (
            SELECT
              organization_id
            FROM
              core.memberships
            WHERE
              user_id = auth.current_user_id ()
          )
        )
        and (
          "mv_account_balances"."type" in ('asset', 'liability', 'equity')
        )
        and ("mv_account_balances"."balance" != 0)
      )
    order by
      "mv_account_balances"."code"
  );

--> statement-breakpoint
CREATE VIEW "ledger"."income_statement"
WITH
  (security_barrier = true) AS (
    select
      "organization_id",
      "period_id",
      "account_id",
      "parent_id",
      "code",
      "name",
      "type",
      "total_debit",
      "total_credit",
      "balance",
      "computed_at"
    from
      "ledger"."mv_account_balances"
    where
      (
        (
          "mv_account_balances"."organization_id" IN (
            SELECT
              organization_id
            FROM
              core.memberships
            WHERE
              user_id = auth.current_user_id ()
          )
        )
        and (
          "mv_account_balances"."type" in ('income', 'expense')
        )
        and ("mv_account_balances"."balance" != 0)
      )
    order by
      "mv_account_balances"."code"
  );

--> statement-breakpoint
CREATE VIEW "core"."organization_members"
WITH
  (security_barrier = true) AS (
    select
      "core"."memberships"."id",
      "core"."memberships"."user_id",
      "core"."memberships"."organization_id",
      "core"."memberships"."role",
      "core"."memberships"."created_at",
      "core"."memberships"."updated_at",
      "core"."memberships"."version",
      "auth"."users"."name",
      "auth"."users"."email",
      "auth"."users"."image"
    from
      "core"."memberships"
      inner join "auth"."users" on "auth"."users"."id" = "core"."memberships"."user_id"
    where
      "core"."memberships"."organization_id" IN (
        SELECT
          m.organization_id
        FROM
          core.memberships m
          JOIN core.organizations o ON o.id = m.organization_id
        WHERE
          m.user_id = auth.current_user_id ()
          AND m.role = 'admin'
          AND o.deleted_at IS NULL
      )
  );

--> statement-breakpoint
CREATE POLICY "accounting_settings_select_policy" ON "core"."accounting_settings" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "core"."accounting_settings"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "accounting_settings_update_policy" ON "core"."accounting_settings" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "core"."accounting_settings"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "accounting_settings_delete_policy" ON "core"."accounting_settings" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "core"."accounting_settings"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "accounting_settings_insert_policy" ON "core"."accounting_settings" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "core"."accounting_settings"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "accounts_select_policy" ON "ledger"."accounts" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "ledger"."accounts"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "accounts_update_policy" ON "ledger"."accounts" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "ledger"."accounts"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "accounts_delete_policy" ON "ledger"."accounts" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "ledger"."accounts"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "accounts_insert_policy" ON "ledger"."accounts" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "ledger"."accounts"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "bank_relations_select_policy" ON "core"."bank_relations" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "core"."bank_relations"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "bank_relations_update_policy" ON "core"."bank_relations" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "core"."bank_relations"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "bank_relations_delete_policy" ON "core"."bank_relations" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "core"."bank_relations"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "bank_relations_insert_policy" ON "core"."bank_relations" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "core"."bank_relations"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "billing_settings_select_policy" ON "core"."billing_settings" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "core"."billing_settings"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "billing_settings_update_policy" ON "core"."billing_settings" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "core"."billing_settings"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "billing_settings_delete_policy" ON "core"."billing_settings" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "core"."billing_settings"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "billing_settings_insert_policy" ON "core"."billing_settings" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "core"."billing_settings"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "clients_select_policy" ON "billing"."clients" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "billing"."clients"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "clients_update_policy" ON "billing"."clients" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "billing"."clients"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "clients_delete_policy" ON "billing"."clients" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "billing"."clients"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "clients_insert_policy" ON "billing"."clients" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "billing"."clients"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "contacts_select_policy" ON "billing"."contacts" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "billing"."contacts"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "contacts_update_policy" ON "billing"."contacts" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "billing"."contacts"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "contacts_delete_policy" ON "billing"."contacts" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "billing"."contacts"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "contacts_insert_policy" ON "billing"."contacts" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "billing"."contacts"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "conversations_select_policy" ON "chat"."conversations" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "chat"."conversations"."user_id" = auth.current_user_id ()
    AND (
      "chat"."conversations"."organization_id" IS NULL
      OR "chat"."conversations"."organization_id" IN (
        SELECT
          organization_id
        FROM
          core.memberships
        WHERE
          user_id = auth.current_user_id ()
      )
    )
  );

--> statement-breakpoint
CREATE POLICY "conversations_insert_policy" ON "chat"."conversations" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "chat"."conversations"."user_id" = auth.current_user_id ()
    AND (
      "chat"."conversations"."organization_id" IS NULL
      OR "chat"."conversations"."organization_id" IN (
        SELECT
          organization_id
        FROM
          core.memberships
        WHERE
          user_id = auth.current_user_id ()
      )
    )
  );

--> statement-breakpoint
CREATE POLICY "conversations_update_policy" ON "chat"."conversations" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "chat"."conversations"."user_id" = auth.current_user_id ()
  )
WITH
  CHECK (
    "chat"."conversations"."user_id" = auth.current_user_id ()
    AND (
      "chat"."conversations"."organization_id" IS NULL
      OR "chat"."conversations"."organization_id" IN (
        SELECT
          organization_id
        FROM
          core.memberships
        WHERE
          user_id = auth.current_user_id ()
      )
    )
  );

--> statement-breakpoint
CREATE POLICY "conversations_delete_policy" ON "chat"."conversations" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "chat"."conversations"."user_id" = auth.current_user_id ()
);

--> statement-breakpoint
CREATE POLICY "datasets_select_policy" ON "migration"."datasets" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "migration"."datasets"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "datasets_update_policy" ON "migration"."datasets" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "migration"."datasets"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "datasets_delete_policy" ON "migration"."datasets" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "migration"."datasets"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "datasets_insert_policy" ON "migration"."datasets" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "migration"."datasets"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "document_templates_select_policy" ON "core"."document_templates" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "core"."document_templates"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "document_templates_update_policy" ON "core"."document_templates" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "core"."document_templates"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "document_templates_delete_policy" ON "core"."document_templates" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "core"."document_templates"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "document_templates_insert_policy" ON "core"."document_templates" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "core"."document_templates"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "invitations_select_policy" ON "core"."invitations" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "core"."invitations"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role = 'admin'
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "invitations_insert_policy" ON "core"."invitations" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "core"."invitations"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role = 'admin'
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "invitations_delete_policy" ON "core"."invitations" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "core"."invitations"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role = 'admin'
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "invoice_journal_entries_select_policy" ON "billing"."invoice_journal_entries" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "billing"."invoice_journal_entries"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "invoice_journal_entries_update_policy" ON "billing"."invoice_journal_entries" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "billing"."invoice_journal_entries"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "invoice_journal_entries_delete_policy" ON "billing"."invoice_journal_entries" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "billing"."invoice_journal_entries"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "invoice_journal_entries_insert_policy" ON "billing"."invoice_journal_entries" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "billing"."invoice_journal_entries"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "invoices_select_policy" ON "billing"."invoices" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "billing"."invoices"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "invoices_update_policy" ON "billing"."invoices" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "billing"."invoices"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "invoices_delete_policy" ON "billing"."invoices" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "billing"."invoices"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "invoices_insert_policy" ON "billing"."invoices" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "billing"."invoices"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "journal_entries_select_policy" ON "ledger"."journal_entries" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "ledger"."journal_entries"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "journal_entries_update_policy" ON "ledger"."journal_entries" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "ledger"."journal_entries"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "journal_entries_delete_policy" ON "ledger"."journal_entries" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "ledger"."journal_entries"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "journal_entries_insert_policy" ON "ledger"."journal_entries" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "ledger"."journal_entries"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "ledger_accounts_select_policy" ON "templates"."ledger_accounts" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (true);

--> statement-breakpoint
CREATE POLICY "ledger_accounts_insert_policy" ON "templates"."ledger_accounts" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (false);

--> statement-breakpoint
CREATE POLICY "ledger_accounts_update_policy" ON "templates"."ledger_accounts" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (false);

--> statement-breakpoint
CREATE POLICY "ledger_accounts_delete_policy" ON "templates"."ledger_accounts" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (false);

--> statement-breakpoint
CREATE POLICY "lines_select_policy" ON "billing"."lines" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "billing"."lines"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "lines_update_policy" ON "billing"."lines" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "billing"."lines"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "lines_delete_policy" ON "billing"."lines" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "billing"."lines"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "lines_insert_policy" ON "billing"."lines" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "billing"."lines"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "llm_reservations_select_policy" ON "metering"."llm_reservations" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "metering"."llm_reservations"."user_id" = auth.current_user_id ()
  );

--> statement-breakpoint
CREATE POLICY "llm_usages_select_policy" ON "metering"."llm_usages" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "metering"."llm_usages"."user_id" = auth.current_user_id ()
  );

--> statement-breakpoint
CREATE POLICY "memberships_select_policy" ON "core"."memberships" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "core"."memberships"."user_id" = auth.current_user_id ()
  );

--> statement-breakpoint
CREATE POLICY "memberships_insert_policy" ON "core"."memberships" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "core"."memberships"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role = 'admin'
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "memberships_update_policy" ON "core"."memberships" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "core"."memberships"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role = 'admin'
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "memberships_delete_policy" ON "core"."memberships" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "core"."memberships"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role = 'admin'
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "messages_select_policy" ON "chat"."messages" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "chat"."messages"."conversation_id" IN (
      SELECT
        id
      FROM
        "chat"."conversations"
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "messages_insert_policy" ON "chat"."messages" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "chat"."messages"."conversation_id" IN (
      SELECT
        id
      FROM
        "chat"."conversations"
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "messages_delete_policy" ON "chat"."messages" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "chat"."messages"."conversation_id" IN (
    SELECT
      id
    FROM
      "chat"."conversations"
    WHERE
      user_id = auth.current_user_id ()
  )
);

--> statement-breakpoint
CREATE POLICY "migrations_select_policy" ON "migration"."migrations" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "migration"."migrations"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "migrations_update_policy" ON "migration"."migrations" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "migration"."migrations"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "migrations_delete_policy" ON "migration"."migrations" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "migration"."migrations"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "migrations_insert_policy" ON "migration"."migrations" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "migration"."migrations"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "movement_journal_entries_select_policy" ON "banking"."movement_journal_entries" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "banking"."movement_journal_entries"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "movement_journal_entries_update_policy" ON "banking"."movement_journal_entries" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "banking"."movement_journal_entries"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "movement_journal_entries_delete_policy" ON "banking"."movement_journal_entries" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "banking"."movement_journal_entries"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "movement_journal_entries_insert_policy" ON "banking"."movement_journal_entries" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "banking"."movement_journal_entries"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "movements_select_policy" ON "banking"."movements" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "banking"."movements"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "movements_update_policy" ON "banking"."movements" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "banking"."movements"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "movements_delete_policy" ON "banking"."movements" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "banking"."movements"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "movements_insert_policy" ON "banking"."movements" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "banking"."movements"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "organizations_select_policy" ON "core"."organizations" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "core"."organizations"."id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "organizations_update_policy" ON "core"."organizations" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "core"."organizations"."deleted_at" IS NULL
    AND "core"."organizations"."id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
        AND role = 'admin'
    )
  )
WITH
  CHECK (
    "core"."organizations"."id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
        AND role = 'admin'
    )
  );

--> statement-breakpoint
CREATE POLICY "organizations_insert_policy" ON "core"."organizations" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (auth.current_user_id () IS NOT NULL);

--> statement-breakpoint
CREATE POLICY "period_journal_entries_select_policy" ON "ledger"."period_journal_entries" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "ledger"."period_journal_entries"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "period_journal_entries_update_policy" ON "ledger"."period_journal_entries" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "ledger"."period_journal_entries"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "period_journal_entries_delete_policy" ON "ledger"."period_journal_entries" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "ledger"."period_journal_entries"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "period_journal_entries_insert_policy" ON "ledger"."period_journal_entries" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "ledger"."period_journal_entries"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "periods_select_policy" ON "ledger"."periods" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "ledger"."periods"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "periods_update_policy" ON "ledger"."periods" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "ledger"."periods"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "periods_delete_policy" ON "ledger"."periods" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "ledger"."periods"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "periods_insert_policy" ON "ledger"."periods" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "ledger"."periods"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "posting_manual_vat_postings_select_policy" ON "ledger"."posting_manual_vat_postings" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "ledger"."posting_manual_vat_postings"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "posting_manual_vat_postings_update_policy" ON "ledger"."posting_manual_vat_postings" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "ledger"."posting_manual_vat_postings"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "posting_manual_vat_postings_delete_policy" ON "ledger"."posting_manual_vat_postings" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "ledger"."posting_manual_vat_postings"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "posting_manual_vat_postings_insert_policy" ON "ledger"."posting_manual_vat_postings" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "ledger"."posting_manual_vat_postings"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "postings_select_policy" ON "ledger"."postings" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "ledger"."postings"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "postings_update_policy" ON "ledger"."postings" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "ledger"."postings"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "postings_delete_policy" ON "ledger"."postings" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "ledger"."postings"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "postings_insert_policy" ON "ledger"."postings" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "ledger"."postings"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "statements_select_policy" ON "banking"."statements" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "banking"."statements"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "statements_update_policy" ON "banking"."statements" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "banking"."statements"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "statements_delete_policy" ON "banking"."statements" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "banking"."statements"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "statements_insert_policy" ON "banking"."statements" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "banking"."statements"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "system_accounts_select_policy" ON "ledger"."system_accounts" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "ledger"."system_accounts"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "system_accounts_update_policy" ON "ledger"."system_accounts" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "ledger"."system_accounts"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "system_accounts_delete_policy" ON "ledger"."system_accounts" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "ledger"."system_accounts"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "system_accounts_insert_policy" ON "ledger"."system_accounts" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "ledger"."system_accounts"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "template_contents_select_policy" ON "core"."template_contents" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "core"."template_contents"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "template_contents_update_policy" ON "core"."template_contents" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "core"."template_contents"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "template_contents_delete_policy" ON "core"."template_contents" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "core"."template_contents"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "template_contents_insert_policy" ON "core"."template_contents" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "core"."template_contents"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "vat_methods_select_policy" ON "core"."vat_methods" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "core"."vat_methods"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "vat_methods_update_policy" ON "core"."vat_methods" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "core"."vat_methods"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "vat_methods_delete_policy" ON "core"."vat_methods" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "core"."vat_methods"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "vat_methods_insert_policy" ON "core"."vat_methods" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "core"."vat_methods"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "vat_periods_select_policy" ON "core"."vat_periods" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "core"."vat_periods"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "vat_periods_update_policy" ON "core"."vat_periods" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "core"."vat_periods"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "vat_periods_delete_policy" ON "core"."vat_periods" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "core"."vat_periods"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "vat_periods_insert_policy" ON "core"."vat_periods" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "core"."vat_periods"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "vat_rates_select_policy" ON "core"."vat_rates" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "core"."vat_rates"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "vat_rates_update_policy" ON "core"."vat_rates" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "core"."vat_rates"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "vat_rates_delete_policy" ON "core"."vat_rates" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "core"."vat_rates"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "vat_rates_insert_policy" ON "core"."vat_rates" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "core"."vat_rates"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "vat_rates_templates_select_policy" ON "templates"."vat_rates" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (true);

--> statement-breakpoint
CREATE POLICY "vat_rates_templates_insert_policy" ON "templates"."vat_rates" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (false);

--> statement-breakpoint
CREATE POLICY "vat_rates_templates_update_policy" ON "templates"."vat_rates" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (false);

--> statement-breakpoint
CREATE POLICY "vat_rates_templates_delete_policy" ON "templates"."vat_rates" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (false);

--> statement-breakpoint
CREATE POLICY "vat_settings_select_policy" ON "core"."vat_settings" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "core"."vat_settings"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "vat_settings_update_policy" ON "core"."vat_settings" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (
    "core"."vat_settings"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );

--> statement-breakpoint
CREATE POLICY "vat_settings_delete_policy" ON "core"."vat_settings" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (
  "core"."vat_settings"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND o.deleted_at IS NULL
  )
);

--> statement-breakpoint
CREATE POLICY "vat_settings_insert_policy" ON "core"."vat_settings" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    "core"."vat_settings"."organization_id" IN (
      SELECT
        m.organization_id
      FROM
        core.memberships m
        JOIN core.organizations o ON o.id = m.organization_id
      WHERE
        m.user_id = auth.current_user_id ()
        AND m.role IN ('admin', 'accountant')
        AND o.deleted_at IS NULL
    )
  );
