-- A claim whose expires_at has passed can no longer be given: no subscription
-- can be put on it, and the subscription settings cannot make it the initial
-- claim. This is how a claim stops being offered.
CREATE OR REPLACE FUNCTION subscription.check_claim_not_expired () RETURNS TRIGGER AS $$
DECLARE
v_claim_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'subscriptions' THEN
    v_claim_id := NEW.claim_id;
  ELSE
    v_claim_id := NEW.initial_claim_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM subscription.claims c
    WHERE c.id = v_claim_id
      AND c.expires_at <= now()
  ) THEN
    RAISE EXCEPTION 'Claim % has expired', v_claim_id
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_subscription_claim_not_expired
BEFORE INSERT OR UPDATE OF claim_id ON subscription.subscriptions FOR EACH ROW
EXECUTE FUNCTION subscription.check_claim_not_expired ();

CREATE TRIGGER enforce_subscription_settings_claim_not_expired
BEFORE INSERT OR UPDATE OF initial_claim_id ON subscription.subscription_settings FOR EACH ROW
EXECUTE FUNCTION subscription.check_claim_not_expired ();
