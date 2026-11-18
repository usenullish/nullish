-- Checks if the subscription of an organization is valid, i.e. if the
-- organization can still be used. When it is not, the organization is locked.
--
-- It is a function because the same check is needed in two places: the
-- policies that lock the organization's data, and the trigger that only lets a
-- locked organization be deleted. Writing it once keeps both in sync.
--
-- It is written in plpgsql because it is created before the subscription tables,
-- and Postgres only checks a plpgsql body when the function is called.
CREATE OR REPLACE FUNCTION subscription.organization_subscription_is_valid (p_organization_id uuid) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM subscription.subscriptions s
    CROSS JOIN subscription.subscription_settings st
    WHERE s.organization_id = p_organization_id
      AND s.status IN ('trialing', 'active', 'past_due')
      AND (
        s.period_end IS NULL
        OR s.period_end > now()
        OR (s.status = 'past_due' AND s.period_end + make_interval(days => st.grace_days) > now())
      )
  );
END;
$$ LANGUAGE plpgsql STABLE;

GRANT
EXECUTE ON FUNCTION subscription.organization_subscription_is_valid (uuid) TO authenticated_user;
