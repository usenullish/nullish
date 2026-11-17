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
CREATE POLICY "invitations_subscription_policy" ON "core"."invitations" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("core"."invitations"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("core"."invitations"."organization_id")
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
CREATE POLICY "accounting_settings_subscription_policy" ON "core"."accounting_settings" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("core"."accounting_settings"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("core"."accounting_settings"."organization_id")
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
CREATE POLICY "document_templates_subscription_policy" ON "core"."document_templates" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("core"."document_templates"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("core"."document_templates"."organization_id")
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
CREATE POLICY "accounts_subscription_policy" ON "ledger"."accounts" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("ledger"."accounts"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("ledger"."accounts"."organization_id")
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
CREATE POLICY "journal_entries_subscription_policy" ON "ledger"."journal_entries" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("ledger"."journal_entries"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("ledger"."journal_entries"."organization_id")
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
CREATE POLICY "periods_subscription_policy" ON "ledger"."periods" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("ledger"."periods"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("ledger"."periods"."organization_id")
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
CREATE POLICY "invoices_subscription_policy" ON "billing"."invoices" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("billing"."invoices"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("billing"."invoices"."organization_id")
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
CREATE POLICY "statements_subscription_policy" ON "banking"."statements" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("banking"."statements"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("banking"."statements"."organization_id")
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
CREATE POLICY "migrations_subscription_policy" ON "migration"."migrations" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("migration"."migrations"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("migration"."migrations"."organization_id")
  );

--> statement-breakpoint
CREATE POLICY "datasets_subscription_policy" ON "migration"."datasets" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  subscription.organization_subscription_is_valid ("migration"."datasets"."organization_id")
)
WITH
  CHECK (
    subscription.organization_subscription_is_valid ("migration"."datasets"."organization_id")
  );
