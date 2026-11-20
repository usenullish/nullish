-- A plan whose expires_at has passed can no longer be given: no subscription
-- can be put on it, and the subscription settings cannot make it the initial
-- plan. This is how a plan stops being offered.
CREATE OR REPLACE FUNCTION subscription.check_plan_not_expired () RETURNS TRIGGER AS $$
DECLARE
v_plan_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'subscriptions' THEN
    v_plan_id := NEW.plan_id;
  ELSE
    v_plan_id := NEW.initial_plan_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM subscription.plans c
    WHERE c.id = v_plan_id
      AND c.expires_at <= now()
  ) THEN
    RAISE EXCEPTION 'Plan % has expired', v_plan_id
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_subscription_plan_not_expired
BEFORE INSERT OR UPDATE OF plan_id ON subscription.subscriptions FOR EACH ROW
EXECUTE FUNCTION subscription.check_plan_not_expired ();

CREATE TRIGGER enforce_subscription_settings_plan_not_expired
BEFORE INSERT OR UPDATE OF initial_plan_id ON subscription.subscription_settings FOR EACH ROW
EXECUTE FUNCTION subscription.check_plan_not_expired ();
