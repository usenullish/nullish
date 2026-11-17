DROP VIEW "core"."organization_members";

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
              AND o.deleted_at IS NULL
          )
        )
        and (
          subscription.organization_subscription_is_valid ("core"."memberships"."organization_id")
        )
      )
  );
