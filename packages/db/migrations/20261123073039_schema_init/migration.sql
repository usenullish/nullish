CREATE TYPE "subscription"."billing_period" AS ENUM('day', 'week', 'month', 'year');

--> statement-breakpoint
CREATE TYPE "subscription"."subscription_provider" AS ENUM('self', 'custom', 'stripe');

--> statement-breakpoint
CREATE TYPE "subscription"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'inactive');

--> statement-breakpoint
CREATE TABLE "subscription"."custom_prices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" uuid NOT NULL,
  "amount" numeric(78, 0) NOT NULL,
  "currency" varchar(20) NOT NULL,
  "billing_period" "subscription"."billing_period" NOT NULL,
  CONSTRAINT "custom_prices_amount_positive" CHECK ("amount" > 0)
);

--> statement-breakpoint
ALTER TABLE "subscription"."custom_prices" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "subscription"."custom_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "plan_id" uuid NOT NULL,
  "provider" "subscription"."subscription_provider" NOT NULL,
  "name" text NOT NULL,
  "contact_url" text NOT NULL,
  CONSTRAINT "custom_products_provider_custom" CHECK ("provider" = 'custom')
);

--> statement-breakpoint
ALTER TABLE "subscription"."custom_products" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "subscription"."external_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "plan_id" uuid NOT NULL,
  "provider" "subscription"."subscription_provider" NOT NULL,
  "name" text NOT NULL,
  "external_product_id" text NOT NULL,
  CONSTRAINT "external_products_provider_third_party" CHECK ("provider" NOT IN ('self', 'custom'))
);

--> statement-breakpoint
ALTER TABLE "subscription"."external_products" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "subscription"."plan_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "max_members" integer NOT NULL,
  CONSTRAINT "plan_rules_max_members_positive" CHECK ("max_members" >= 1)
);

--> statement-breakpoint
ALTER TABLE "subscription"."plan_rules" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "subscription"."plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "trial_days" integer,
  "expires_at" timestamp with time zone,
  "provider" "subscription"."subscription_provider" NOT NULL,
  "plan_rules_id" uuid,
  CONSTRAINT "plans_id_provider_unique" UNIQUE ("id", "provider"),
  CONSTRAINT "plans_trial_days_positive" CHECK ("trial_days" >= 1),
  CONSTRAINT "plans_trial_days_self" CHECK (
    "provider" = 'self'
    OR "trial_days" IS NULL
  ),
  CONSTRAINT "plans_rules_not_custom" CHECK (
    "provider" <> 'custom'
    OR "plan_rules_id" IS NULL
  )
);

--> statement-breakpoint
ALTER TABLE "subscription"."plans" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "subscription"."subscription_references" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "subscription_id" uuid NOT NULL,
  "provider" "subscription"."subscription_provider" NOT NULL,
  "external_customer_id" text NOT NULL,
  "external_subscription_id" text NOT NULL,
  CONSTRAINT "subscription_references_provider_third_party" CHECK ("provider" NOT IN ('self', 'custom'))
);

--> statement-breakpoint
CREATE TABLE "subscription"."subscription_settings" (
  "id" integer PRIMARY KEY DEFAULT 1,
  "initial_plan_id" uuid NOT NULL,
  "grace_days" integer DEFAULT 7 NOT NULL,
  CONSTRAINT "subscription_settings_single_row" CHECK ("id" = 1),
  CONSTRAINT "subscription_settings_grace_days_non_negative" CHECK ("grace_days" >= 0)
);

--> statement-breakpoint
ALTER TABLE "subscription"."subscription_settings" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "subscription"."subscription_tax_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" "subscription"."subscription_provider" NOT NULL,
  "external_tax_rate_id" text NOT NULL,
  "start_on" date NOT NULL,
  "end_on" date,
  CONSTRAINT "subscription_tax_rates_provider_third_party" CHECK ("provider" NOT IN ('self', 'custom')),
  CONSTRAINT "subscription_tax_rates_end_after_start" CHECK (
    "end_on" IS NULL
    OR "end_on" >= "start_on"
  )
);

--> statement-breakpoint
CREATE TABLE "subscription"."subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "plan_id" uuid NOT NULL,
  "status" "subscription"."subscription_status" NOT NULL,
  "period_end" timestamp with time zone,
  "cancel_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "subscriptions_trialing_period_end" CHECK (
    "status" <> 'trialing'
    OR "period_end" IS NOT NULL
  ),
  CONSTRAINT "subscriptions_past_due_period_end" CHECK (
    "status" <> 'past_due'
    OR "period_end" IS NOT NULL
  ),
  CONSTRAINT "subscriptions_inactive_cancel_at" CHECK (
    "status" <> 'inactive'
    OR "cancel_at" IS NULL
  )
);

--> statement-breakpoint
ALTER TABLE "subscription"."subscriptions" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
DROP VIEW "core"."organization_members";

--> statement-breakpoint
CREATE UNIQUE INDEX "custom_prices_product_currency_billing_period_uidx" ON "subscription"."custom_prices" ("product_id", "currency", "billing_period");

--> statement-breakpoint
CREATE UNIQUE INDEX "custom_products_plan_uidx" ON "subscription"."custom_products" ("plan_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "external_products_plan_uidx" ON "subscription"."external_products" ("plan_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "external_products_provider_external_product_uidx" ON "subscription"."external_products" ("provider", "external_product_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_references_subscription_uidx" ON "subscription"."subscription_references" ("subscription_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_references_provider_external_subscription_uidx" ON "subscription"."subscription_references" ("provider", "external_subscription_id");

--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_tax_rates_provider_start_uidx" ON "subscription"."subscription_tax_rates" ("provider", "start_on");

--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_org_uidx" ON "subscription"."subscriptions" ("organization_id");

--> statement-breakpoint
ALTER TABLE "subscription"."custom_prices"
ADD CONSTRAINT "custom_prices_product_id_custom_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "subscription"."custom_products" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "subscription"."custom_prices"
ADD CONSTRAINT "custom_prices_currency_currencies_code_fkey" FOREIGN KEY ("currency") REFERENCES "core"."currencies" ("code");

--> statement-breakpoint
ALTER TABLE "subscription"."custom_products"
ADD CONSTRAINT "custom_products_plan_provider_fkey" FOREIGN KEY ("plan_id", "provider") REFERENCES "subscription"."plans" ("id", "provider") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "subscription"."external_products"
ADD CONSTRAINT "external_products_plan_provider_fkey" FOREIGN KEY ("plan_id", "provider") REFERENCES "subscription"."plans" ("id", "provider") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "subscription"."plans"
ADD CONSTRAINT "plans_plan_rules_id_plan_rules_id_fkey" FOREIGN KEY ("plan_rules_id") REFERENCES "subscription"."plan_rules" ("id");

--> statement-breakpoint
ALTER TABLE "subscription"."subscription_references"
ADD CONSTRAINT "subscription_references_subscription_id_subscriptions_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription"."subscriptions" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "subscription"."subscription_settings"
ADD CONSTRAINT "subscription_settings_initial_plan_id_plans_id_fkey" FOREIGN KEY ("initial_plan_id") REFERENCES "subscription"."plans" ("id");

--> statement-breakpoint
ALTER TABLE "subscription"."subscriptions"
ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "subscription"."subscriptions"
ADD CONSTRAINT "subscriptions_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription"."plans" ("id");

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
      (
        (
          "core"."memberships"."organization_id" IN (
            SELECT
              m.organization_id
            FROM
              core.memberships m
              JOIN core.organizations o ON o.id = m.organization_id
            WHERE
              m.user_id = auth.current_user_id ()
              AND m.role = 'admin'
              AND core.organization_is_not_deleted (o.deleted_at)
          )
        )
        and (
          subscription.organization_subscription_is_valid ("core"."memberships"."organization_id")
        )
      )
  );

--> statement-breakpoint
CREATE POLICY "accounting_settings_subscription_policy" ON "core"."accounting_settings" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("core"."accounting_settings"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("core"."accounting_settings"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "accounts_subscription_policy" ON "ledger"."accounts" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("ledger"."accounts"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("ledger"."accounts"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "bank_relations_subscription_policy" ON "core"."bank_relations" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("core"."bank_relations"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("core"."bank_relations"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "billing_settings_subscription_policy" ON "core"."billing_settings" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("core"."billing_settings"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("core"."billing_settings"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "clients_subscription_policy" ON "billing"."clients" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("billing"."clients"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("billing"."clients"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "contacts_subscription_policy" ON "billing"."contacts" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("billing"."contacts"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("billing"."contacts"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "custom_prices_select_policy" ON "subscription"."custom_prices" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (true);

--> statement-breakpoint
CREATE POLICY "custom_prices_insert_policy" ON "subscription"."custom_prices" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (false);

--> statement-breakpoint
CREATE POLICY "custom_prices_update_policy" ON "subscription"."custom_prices" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (false);

--> statement-breakpoint
CREATE POLICY "custom_prices_delete_policy" ON "subscription"."custom_prices" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (false);

--> statement-breakpoint
CREATE POLICY "custom_products_select_policy" ON "subscription"."custom_products" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (true);

--> statement-breakpoint
CREATE POLICY "custom_products_insert_policy" ON "subscription"."custom_products" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (false);

--> statement-breakpoint
CREATE POLICY "custom_products_update_policy" ON "subscription"."custom_products" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (false);

--> statement-breakpoint
CREATE POLICY "custom_products_delete_policy" ON "subscription"."custom_products" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (false);

--> statement-breakpoint
CREATE POLICY "datasets_subscription_policy" ON "migration"."datasets" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("migration"."datasets"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("migration"."datasets"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "document_templates_subscription_policy" ON "core"."document_templates" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("core"."document_templates"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("core"."document_templates"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "external_products_select_policy" ON "subscription"."external_products" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (true);

--> statement-breakpoint
CREATE POLICY "external_products_insert_policy" ON "subscription"."external_products" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (false);

--> statement-breakpoint
CREATE POLICY "external_products_update_policy" ON "subscription"."external_products" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (false);

--> statement-breakpoint
CREATE POLICY "external_products_delete_policy" ON "subscription"."external_products" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (false);

--> statement-breakpoint
CREATE POLICY "invitations_subscription_policy" ON "core"."invitations" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("core"."invitations"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("core"."invitations"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "invoice_journal_entries_subscription_policy" ON "billing"."invoice_journal_entries" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid (
    "billing"."invoice_journal_entries"."organization_id"
  )
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid (
      "billing"."invoice_journal_entries"."organization_id"
    )
  );

--> statement-breakpoint
CREATE POLICY "invoices_subscription_policy" ON "billing"."invoices" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("billing"."invoices"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("billing"."invoices"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "journal_entries_subscription_policy" ON "ledger"."journal_entries" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("ledger"."journal_entries"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("ledger"."journal_entries"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "lines_subscription_policy" ON "billing"."lines" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("billing"."lines"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("billing"."lines"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "memberships_subscription_insert_policy" ON "core"."memberships" AS RESTRICTIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("core"."memberships"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "memberships_subscription_update_policy" ON "core"."memberships" AS RESTRICTIVE
FOR UPDATE
  TO "authenticated_user" USING (
    subscription.organization_subscription_is_valid ("core"."memberships"."organization_id")
  )
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("core"."memberships"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "memberships_subscription_delete_policy" ON "core"."memberships" AS RESTRICTIVE FOR DELETE TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("core"."memberships"."organization_id")
);

--> statement-breakpoint
CREATE POLICY "migrations_subscription_policy" ON "migration"."migrations" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("migration"."migrations"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("migration"."migrations"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "movement_journal_entries_subscription_policy" ON "banking"."movement_journal_entries" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid (
    "banking"."movement_journal_entries"."organization_id"
  )
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid (
      "banking"."movement_journal_entries"."organization_id"
    )
  );

--> statement-breakpoint
CREATE POLICY "movements_subscription_policy" ON "banking"."movements" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("banking"."movements"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("banking"."movements"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "period_journal_entries_subscription_policy" ON "ledger"."period_journal_entries" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid (
    "ledger"."period_journal_entries"."organization_id"
  )
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid (
      "ledger"."period_journal_entries"."organization_id"
    )
  );

--> statement-breakpoint
CREATE POLICY "periods_subscription_policy" ON "ledger"."periods" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("ledger"."periods"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("ledger"."periods"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "plan_rules_select_policy" ON "subscription"."plan_rules" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (true);

--> statement-breakpoint
CREATE POLICY "plan_rules_insert_policy" ON "subscription"."plan_rules" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (false);

--> statement-breakpoint
CREATE POLICY "plan_rules_update_policy" ON "subscription"."plan_rules" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (false);

--> statement-breakpoint
CREATE POLICY "plan_rules_delete_policy" ON "subscription"."plan_rules" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (false);

--> statement-breakpoint
CREATE POLICY "plans_select_policy" ON "subscription"."plans" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (true);

--> statement-breakpoint
CREATE POLICY "plans_insert_policy" ON "subscription"."plans" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (false);

--> statement-breakpoint
CREATE POLICY "plans_update_policy" ON "subscription"."plans" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (false);

--> statement-breakpoint
CREATE POLICY "plans_delete_policy" ON "subscription"."plans" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (false);

--> statement-breakpoint
CREATE POLICY "posting_manual_vat_postings_subscription_policy" ON "ledger"."posting_manual_vat_postings" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid (
    "ledger"."posting_manual_vat_postings"."organization_id"
  )
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid (
      "ledger"."posting_manual_vat_postings"."organization_id"
    )
  );

--> statement-breakpoint
CREATE POLICY "postings_subscription_policy" ON "ledger"."postings" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("ledger"."postings"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("ledger"."postings"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "statements_subscription_policy" ON "banking"."statements" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("banking"."statements"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("banking"."statements"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "subscription_settings_select_policy" ON "subscription"."subscription_settings" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (true);

--> statement-breakpoint
CREATE POLICY "subscription_settings_insert_policy" ON "subscription"."subscription_settings" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (false);

--> statement-breakpoint
CREATE POLICY "subscription_settings_update_policy" ON "subscription"."subscription_settings" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (false);

--> statement-breakpoint
CREATE POLICY "subscription_settings_delete_policy" ON "subscription"."subscription_settings" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (false);

--> statement-breakpoint
CREATE POLICY "subscriptions_select_policy" ON "subscription"."subscriptions" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (
    "subscription"."subscriptions"."organization_id" IN (
      SELECT
        organization_id
      FROM
        core.memberships
      WHERE
        user_id = auth.current_user_id ()
    )
  );

--> statement-breakpoint
CREATE POLICY "system_accounts_subscription_policy" ON "ledger"."system_accounts" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("ledger"."system_accounts"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("ledger"."system_accounts"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "template_contents_subscription_policy" ON "core"."template_contents" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("core"."template_contents"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("core"."template_contents"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "vat_methods_subscription_policy" ON "core"."vat_methods" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("core"."vat_methods"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("core"."vat_methods"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "vat_periods_subscription_policy" ON "core"."vat_periods" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("core"."vat_periods"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("core"."vat_periods"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "vat_rates_subscription_policy" ON "core"."vat_rates" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("core"."vat_rates"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("core"."vat_rates"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "vat_settings_subscription_policy" ON "core"."vat_settings" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("core"."vat_settings"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("core"."vat_settings"."organization_id")
  );

--> statement-breakpoint
ALTER POLICY "accounting_settings_update_policy" ON "core"."accounting_settings" TO "authenticated_user" USING (
  "core"."accounting_settings"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "accounting_settings_delete_policy" ON "core"."accounting_settings" TO "authenticated_user" USING (
  "core"."accounting_settings"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "accounting_settings_insert_policy" ON "core"."accounting_settings" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "accounts_update_policy" ON "ledger"."accounts" TO "authenticated_user" USING (
  "ledger"."accounts"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "accounts_delete_policy" ON "ledger"."accounts" TO "authenticated_user" USING (
  "ledger"."accounts"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "accounts_insert_policy" ON "ledger"."accounts" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "bank_relations_update_policy" ON "core"."bank_relations" TO "authenticated_user" USING (
  "core"."bank_relations"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "bank_relations_delete_policy" ON "core"."bank_relations" TO "authenticated_user" USING (
  "core"."bank_relations"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "bank_relations_insert_policy" ON "core"."bank_relations" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "billing_settings_update_policy" ON "core"."billing_settings" TO "authenticated_user" USING (
  "core"."billing_settings"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "billing_settings_delete_policy" ON "core"."billing_settings" TO "authenticated_user" USING (
  "core"."billing_settings"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "billing_settings_insert_policy" ON "core"."billing_settings" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "clients_update_policy" ON "billing"."clients" TO "authenticated_user" USING (
  "billing"."clients"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "clients_delete_policy" ON "billing"."clients" TO "authenticated_user" USING (
  "billing"."clients"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "clients_insert_policy" ON "billing"."clients" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "contacts_update_policy" ON "billing"."contacts" TO "authenticated_user" USING (
  "billing"."contacts"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "contacts_delete_policy" ON "billing"."contacts" TO "authenticated_user" USING (
  "billing"."contacts"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "contacts_insert_policy" ON "billing"."contacts" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "datasets_update_policy" ON "migration"."datasets" TO "authenticated_user" USING (
  "migration"."datasets"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "datasets_delete_policy" ON "migration"."datasets" TO "authenticated_user" USING (
  "migration"."datasets"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "datasets_insert_policy" ON "migration"."datasets" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "document_templates_update_policy" ON "core"."document_templates" TO "authenticated_user" USING (
  "core"."document_templates"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "document_templates_delete_policy" ON "core"."document_templates" TO "authenticated_user" USING (
  "core"."document_templates"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "document_templates_insert_policy" ON "core"."document_templates" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "invitations_select_policy" ON "core"."invitations" TO "authenticated_user" USING (
  "core"."invitations"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role = 'admin'
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "invitations_insert_policy" ON "core"."invitations" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "invitations_delete_policy" ON "core"."invitations" TO "authenticated_user" USING (
  "core"."invitations"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role = 'admin'
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "invoice_journal_entries_update_policy" ON "billing"."invoice_journal_entries" TO "authenticated_user" USING (
  "billing"."invoice_journal_entries"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "invoice_journal_entries_delete_policy" ON "billing"."invoice_journal_entries" TO "authenticated_user" USING (
  "billing"."invoice_journal_entries"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "invoice_journal_entries_insert_policy" ON "billing"."invoice_journal_entries" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "invoices_update_policy" ON "billing"."invoices" TO "authenticated_user" USING (
  "billing"."invoices"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "invoices_delete_policy" ON "billing"."invoices" TO "authenticated_user" USING (
  "billing"."invoices"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "invoices_insert_policy" ON "billing"."invoices" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "journal_entries_update_policy" ON "ledger"."journal_entries" TO "authenticated_user" USING (
  "ledger"."journal_entries"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "journal_entries_delete_policy" ON "ledger"."journal_entries" TO "authenticated_user" USING (
  "ledger"."journal_entries"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "journal_entries_insert_policy" ON "ledger"."journal_entries" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "lines_update_policy" ON "billing"."lines" TO "authenticated_user" USING (
  "billing"."lines"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "lines_delete_policy" ON "billing"."lines" TO "authenticated_user" USING (
  "billing"."lines"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "lines_insert_policy" ON "billing"."lines" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "memberships_insert_policy" ON "core"."memberships" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "memberships_update_policy" ON "core"."memberships" TO "authenticated_user" USING (
  "core"."memberships"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role = 'admin'
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "memberships_delete_policy" ON "core"."memberships" TO "authenticated_user" USING (
  "core"."memberships"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role = 'admin'
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "migrations_update_policy" ON "migration"."migrations" TO "authenticated_user" USING (
  "migration"."migrations"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "migrations_delete_policy" ON "migration"."migrations" TO "authenticated_user" USING (
  "migration"."migrations"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "migrations_insert_policy" ON "migration"."migrations" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "movement_journal_entries_update_policy" ON "banking"."movement_journal_entries" TO "authenticated_user" USING (
  "banking"."movement_journal_entries"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "movement_journal_entries_delete_policy" ON "banking"."movement_journal_entries" TO "authenticated_user" USING (
  "banking"."movement_journal_entries"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "movement_journal_entries_insert_policy" ON "banking"."movement_journal_entries" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "movements_update_policy" ON "banking"."movements" TO "authenticated_user" USING (
  "banking"."movements"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "movements_delete_policy" ON "banking"."movements" TO "authenticated_user" USING (
  "banking"."movements"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "movements_insert_policy" ON "banking"."movements" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "organizations_update_policy" ON "core"."organizations" TO "authenticated_user" USING (
  core.organization_is_not_deleted ("core"."organizations"."deleted_at")
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
ALTER POLICY "period_journal_entries_update_policy" ON "ledger"."period_journal_entries" TO "authenticated_user" USING (
  "ledger"."period_journal_entries"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "period_journal_entries_delete_policy" ON "ledger"."period_journal_entries" TO "authenticated_user" USING (
  "ledger"."period_journal_entries"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "period_journal_entries_insert_policy" ON "ledger"."period_journal_entries" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "periods_update_policy" ON "ledger"."periods" TO "authenticated_user" USING (
  "ledger"."periods"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "periods_delete_policy" ON "ledger"."periods" TO "authenticated_user" USING (
  "ledger"."periods"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "periods_insert_policy" ON "ledger"."periods" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "posting_manual_vat_postings_update_policy" ON "ledger"."posting_manual_vat_postings" TO "authenticated_user" USING (
  "ledger"."posting_manual_vat_postings"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "posting_manual_vat_postings_delete_policy" ON "ledger"."posting_manual_vat_postings" TO "authenticated_user" USING (
  "ledger"."posting_manual_vat_postings"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "posting_manual_vat_postings_insert_policy" ON "ledger"."posting_manual_vat_postings" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "postings_update_policy" ON "ledger"."postings" TO "authenticated_user" USING (
  "ledger"."postings"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "postings_delete_policy" ON "ledger"."postings" TO "authenticated_user" USING (
  "ledger"."postings"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "postings_insert_policy" ON "ledger"."postings" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "statements_update_policy" ON "banking"."statements" TO "authenticated_user" USING (
  "banking"."statements"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "statements_delete_policy" ON "banking"."statements" TO "authenticated_user" USING (
  "banking"."statements"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "statements_insert_policy" ON "banking"."statements" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "system_accounts_update_policy" ON "ledger"."system_accounts" TO "authenticated_user" USING (
  "ledger"."system_accounts"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "system_accounts_delete_policy" ON "ledger"."system_accounts" TO "authenticated_user" USING (
  "ledger"."system_accounts"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "system_accounts_insert_policy" ON "ledger"."system_accounts" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "template_contents_update_policy" ON "core"."template_contents" TO "authenticated_user" USING (
  "core"."template_contents"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "template_contents_delete_policy" ON "core"."template_contents" TO "authenticated_user" USING (
  "core"."template_contents"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "template_contents_insert_policy" ON "core"."template_contents" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "vat_methods_update_policy" ON "core"."vat_methods" TO "authenticated_user" USING (
  "core"."vat_methods"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "vat_methods_delete_policy" ON "core"."vat_methods" TO "authenticated_user" USING (
  "core"."vat_methods"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "vat_methods_insert_policy" ON "core"."vat_methods" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "vat_periods_update_policy" ON "core"."vat_periods" TO "authenticated_user" USING (
  "core"."vat_periods"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "vat_periods_delete_policy" ON "core"."vat_periods" TO "authenticated_user" USING (
  "core"."vat_periods"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "vat_periods_insert_policy" ON "core"."vat_periods" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "vat_rates_update_policy" ON "core"."vat_rates" TO "authenticated_user" USING (
  "core"."vat_rates"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "vat_rates_delete_policy" ON "core"."vat_rates" TO "authenticated_user" USING (
  "core"."vat_rates"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "vat_rates_insert_policy" ON "core"."vat_rates" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );

--> statement-breakpoint
ALTER POLICY "vat_settings_update_policy" ON "core"."vat_settings" TO "authenticated_user" USING (
  "core"."vat_settings"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "vat_settings_delete_policy" ON "core"."vat_settings" TO "authenticated_user" USING (
  "core"."vat_settings"."organization_id" IN (
    SELECT
      m.organization_id
    FROM
      core.memberships m
      JOIN core.organizations o ON o.id = m.organization_id
    WHERE
      m.user_id = auth.current_user_id ()
      AND m.role IN ('admin', 'accountant')
      AND core.organization_is_not_deleted (o.deleted_at)
  )
);

--> statement-breakpoint
ALTER POLICY "vat_settings_insert_policy" ON "core"."vat_settings" TO "authenticated_user"
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
        AND core.organization_is_not_deleted (o.deleted_at)
    )
  );
