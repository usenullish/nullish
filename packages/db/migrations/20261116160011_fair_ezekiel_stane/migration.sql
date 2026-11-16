CREATE SCHEMA "instance";
--> statement-breakpoint
CREATE TYPE "core"."subscription_status" AS ENUM('pending', 'active', 'past_due', 'canceled');--> statement-breakpoint
CREATE TABLE "core"."subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"status" "core"."subscription_status" NOT NULL,
	"period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "instance"."organization_rules" (
	"id" integer PRIMARY KEY DEFAULT 1,
	"initial_subscription_status" "core"."subscription_status" DEFAULT 'active'::"core"."subscription_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "organization_rules_single_row" CHECK ("id" = 1),
	CONSTRAINT "organization_rules_initial_subscription_status" CHECK ("initial_subscription_status" IN ('active', 'pending'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_org_uidx" ON "core"."subscriptions" ("organization_id");--> statement-breakpoint
ALTER TABLE "core"."subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "core"."organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE POLICY "subscriptions_select_policy" ON "core"."subscriptions" AS PERMISSIVE FOR SELECT TO "authenticated_user" USING ("core"."subscriptions"."organization_id" IN (
  SELECT organization_id FROM core.memberships
  WHERE user_id = auth.current_user_id()
));