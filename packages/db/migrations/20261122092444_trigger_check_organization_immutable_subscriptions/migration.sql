-- A subscription can never be moved to a different organization once created,
-- like the other records of an organization.
CREATE TRIGGER enforce_organization_immutable
BEFORE UPDATE ON subscription.subscriptions FOR EACH ROW
EXECUTE FUNCTION core.check_organization_immutable ();
