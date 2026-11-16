-- The rules the instance applies to every organization, e.g. the status of the
-- subscription a new organization starts with. They live in a single row,
-- inserted here and never deleted, so that the triggers reading it can rely on
-- it.
--
-- The row starts with active subscriptions: organizations are usable without
-- paying, as on a self-hosted instance. An instance requiring a paid
-- subscription sets it to pending.
INSERT INTO
  instance.organization_rules (id, initial_subscription_status)
VALUES
  (1, 'active');

CREATE OR REPLACE FUNCTION instance.check_organization_rules_not_deleted () RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'The organization rules cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_organization_rules_not_deleted
BEFORE DELETE ON instance.organization_rules FOR EACH ROW
EXECUTE FUNCTION instance.check_organization_rules_not_deleted ();

CREATE TRIGGER enforce_organization_rules_not_truncated
BEFORE TRUNCATE ON instance.organization_rules FOR EACH STATEMENT
EXECUTE FUNCTION instance.check_organization_rules_not_deleted ();
