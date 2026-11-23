-- Seeds the subscription settings: a single row saying which plan a new
-- organization gets, the one seeded by 20261117093252_seed_initial_plan.
--
-- The row cannot be deleted, because creating an organization reads it.
INSERT INTO
  subscription.subscription_settings (id, initial_plan_id)
VALUES
  (
    1,
    (
      SELECT
        id
      FROM
        subscription.plans
    )
  );

CREATE OR REPLACE FUNCTION subscription.check_subscription_settings_not_deleted () RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'The subscription settings cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_subscription_settings_not_deleted
BEFORE DELETE ON subscription.subscription_settings FOR EACH ROW
EXECUTE FUNCTION subscription.check_subscription_settings_not_deleted ();

CREATE TRIGGER enforce_subscription_settings_not_truncated
BEFORE TRUNCATE ON subscription.subscription_settings FOR EACH STATEMENT
EXECUTE FUNCTION subscription.check_subscription_settings_not_deleted ();
