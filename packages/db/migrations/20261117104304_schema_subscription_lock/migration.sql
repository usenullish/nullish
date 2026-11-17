CREATE POLICY "vat_methods_subscription_policy" ON "core"."vat_methods" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "core"."vat_methods"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "core"."vat_methods"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "vat_periods_subscription_policy" ON "core"."vat_periods" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "core"."vat_periods"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "core"."vat_periods"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "vat_rates_subscription_policy" ON "core"."vat_rates" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "core"."vat_rates"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "core"."vat_rates"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "vat_settings_subscription_policy" ON "core"."vat_settings" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "core"."vat_settings"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "core"."vat_settings"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "accounting_settings_subscription_policy" ON "core"."accounting_settings" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "core"."accounting_settings"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "core"."accounting_settings"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "bank_relations_subscription_policy" ON "core"."bank_relations" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "core"."bank_relations"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "core"."bank_relations"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "billing_settings_subscription_policy" ON "core"."billing_settings" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "core"."billing_settings"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "core"."billing_settings"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "document_templates_subscription_policy" ON "core"."document_templates" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "core"."document_templates"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "core"."document_templates"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "template_contents_subscription_policy" ON "core"."template_contents" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "core"."template_contents"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "core"."template_contents"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "accounts_subscription_policy" ON "ledger"."accounts" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "ledger"."accounts"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "ledger"."accounts"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "system_accounts_subscription_policy" ON "ledger"."system_accounts" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "ledger"."system_accounts"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "ledger"."system_accounts"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "journal_entries_subscription_policy" ON "ledger"."journal_entries" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "ledger"."journal_entries"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "ledger"."journal_entries"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "postings_subscription_policy" ON "ledger"."postings" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "ledger"."postings"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "ledger"."postings"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "periods_subscription_policy" ON "ledger"."periods" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "ledger"."periods"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "ledger"."periods"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "period_journal_entries_subscription_policy" ON "ledger"."period_journal_entries" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "ledger"."period_journal_entries"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "ledger"."period_journal_entries"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "posting_manual_vat_postings_subscription_policy" ON "ledger"."posting_manual_vat_postings" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "ledger"."posting_manual_vat_postings"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "ledger"."posting_manual_vat_postings"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "clients_subscription_policy" ON "billing"."clients" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "billing"."clients"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "billing"."clients"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "contacts_subscription_policy" ON "billing"."contacts" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "billing"."contacts"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "billing"."contacts"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "invoices_subscription_policy" ON "billing"."invoices" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "billing"."invoices"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "billing"."invoices"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "lines_subscription_policy" ON "billing"."lines" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "billing"."lines"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "billing"."lines"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "invoice_journal_entries_subscription_policy" ON "billing"."invoice_journal_entries" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "billing"."invoice_journal_entries"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "billing"."invoice_journal_entries"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "statements_subscription_policy" ON "banking"."statements" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "banking"."statements"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "banking"."statements"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "movements_subscription_policy" ON "banking"."movements" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "banking"."movements"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "banking"."movements"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "movement_journal_entries_subscription_policy" ON "banking"."movement_journal_entries" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "banking"."movement_journal_entries"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "banking"."movement_journal_entries"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "migrations_subscription_policy" ON "migration"."migrations" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "migration"."migrations"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "migration"."migrations"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );

--> statement-breakpoint
CREATE POLICY "datasets_subscription_policy" ON "migration"."datasets" AS RESTRICTIVE FOR ALL TO "authenticated_user" USING (
  "migration"."datasets"."organization_id" IN (
    SELECT
      s.organization_id
    FROM
      subscription.subscriptions s
      CROSS JOIN subscription.subscription_settings st
    WHERE
      s.status IN ('active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (
          s.status = 'past_due'
          AND s.period_end + make_interval(days => st.grace_days) > now()
        )
      )
  )
)
WITH
  CHECK (
    "migration"."datasets"."organization_id" IN (
      SELECT
        s.organization_id
      FROM
        subscription.subscriptions s
        CROSS JOIN subscription.subscription_settings st
      WHERE
        s.status IN ('active', 'past_due')
        AND (
          s.period_end IS NULL
          OR s.period_end > now()
          OR (
            s.status = 'past_due'
            AND s.period_end + make_interval(days => st.grace_days) > now()
          )
        )
    )
  );
