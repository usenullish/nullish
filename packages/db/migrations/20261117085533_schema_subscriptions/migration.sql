CREATE SCHEMA "subscription";

--> statement-breakpoint
CREATE TYPE "subscription"."subscription_status" AS ENUM('active', 'past_due', 'inactive');

--> statement-breakpoint
CREATE TABLE "subscription"."claims" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "trial_days" integer,
  "expires_at" timestamp with time zone,
  CONSTRAINT "claims_trial_days_positive" CHECK ("trial_days" >= 1)
);

--> statement-breakpoint
ALTER TABLE "subscription"."claims" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "subscription"."subscription_settings" (
  "id" integer PRIMARY KEY DEFAULT 1,
  "initial_claim_id" uuid NOT NULL,
  "grace_days" integer DEFAULT 7 NOT NULL,
  CONSTRAINT "subscription_settings_single_row" CHECK ("id" = 1),
  CONSTRAINT "subscription_settings_grace_days_non_negative" CHECK ("grace_days" >= 0)
);

--> statement-breakpoint
ALTER TABLE "subscription"."subscription_settings" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE TABLE "subscription"."subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "claim_id" uuid NOT NULL,
  "status" "subscription"."subscription_status" NOT NULL,
  "period_end" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
ALTER TABLE "subscription"."subscriptions" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_org_uidx" ON "subscription"."subscriptions" ("organization_id");

--> statement-breakpoint
ALTER TABLE "subscription"."subscription_settings"
ADD CONSTRAINT "subscription_settings_initial_claim_id_claims_id_fkey" FOREIGN KEY ("initial_claim_id") REFERENCES "subscription"."claims" ("id");

--> statement-breakpoint
ALTER TABLE "subscription"."subscriptions"
ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations" ("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "subscription"."subscriptions"
ADD CONSTRAINT "subscriptions_claim_id_claims_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "subscription"."claims" ("id");

--> statement-breakpoint
CREATE POLICY "claims_select_policy" ON "subscription"."claims" AS PERMISSIVE FOR
SELECT
  TO "authenticated_user" USING (true);

--> statement-breakpoint
CREATE POLICY "claims_insert_policy" ON "subscription"."claims" AS PERMISSIVE FOR INSERT TO "authenticated_user"
WITH
  CHECK (false);

--> statement-breakpoint
CREATE POLICY "claims_update_policy" ON "subscription"."claims" AS PERMISSIVE
FOR UPDATE
  TO "authenticated_user" USING (false);

--> statement-breakpoint
CREATE POLICY "claims_delete_policy" ON "subscription"."claims" AS PERMISSIVE FOR DELETE TO "authenticated_user" USING (false);

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
