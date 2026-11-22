-- A new organization gets a subscription on the initial plan without paying.
-- Only a plan of the instance itself can be given away like this: a trial or
-- the free plan of a self-hosted instance. A plan of a payment provider is
-- only reached through a checkout, and a custom plan is only an offer.
CREATE OR REPLACE FUNCTION subscription.check_initial_plan_self () RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM subscription.plans p
    WHERE p.id = NEW.initial_plan_id
      AND p.provider <> 'self'
  ) THEN
    RAISE EXCEPTION 'Plan % is not a self plan and cannot be the initial plan', NEW.initial_plan_id
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_subscription_settings_initial_plan_self
BEFORE INSERT OR UPDATE OF initial_plan_id ON subscription.subscription_settings FOR EACH ROW
EXECUTE FUNCTION subscription.check_initial_plan_self ();
