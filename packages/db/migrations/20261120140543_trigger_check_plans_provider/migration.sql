-- Custom plans (e.g. an own instance or on-prem) are only displayed as offers.
-- Organizations never subscribe to them, so neither a subscription nor the
-- initial plan of the subscription settings can point to one.
CREATE OR REPLACE FUNCTION subscription.check_plan_not_custom () RETURNS TRIGGER AS $$
DECLARE
v_plan_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'subscriptions' THEN
    v_plan_id := NEW.plan_id;
  ELSE
    v_plan_id := NEW.initial_plan_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM subscription.plans p
    WHERE p.id = v_plan_id
      AND p.provider = 'custom'
  ) THEN
    RAISE EXCEPTION 'Plan % is a custom plan and cannot be subscribed to', v_plan_id
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_subscription_plan_not_custom
BEFORE INSERT OR UPDATE OF plan_id ON subscription.subscriptions FOR EACH ROW
EXECUTE FUNCTION subscription.check_plan_not_custom ();

CREATE TRIGGER enforce_subscription_settings_plan_not_custom
BEFORE INSERT OR UPDATE OF initial_plan_id ON subscription.subscription_settings FOR EACH ROW
EXECUTE FUNCTION subscription.check_plan_not_custom ();
