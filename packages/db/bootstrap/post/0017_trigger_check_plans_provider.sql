-- Custom plans (e.g. an own instance or on-prem) are only displayed as offers.
-- Organizations never subscribe to them, so no subscription can point to one.
CREATE OR REPLACE FUNCTION subscription.check_plan_not_custom () RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM subscription.plans p
    WHERE p.id = NEW.plan_id
      AND p.provider = 'custom'
  ) THEN
    RAISE EXCEPTION 'Plan % is a custom plan and cannot be subscribed to', NEW.plan_id
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_subscription_plan_not_custom
BEFORE INSERT OR UPDATE OF plan_id ON subscription.subscriptions FOR EACH ROW
EXECUTE FUNCTION subscription.check_plan_not_custom ();
