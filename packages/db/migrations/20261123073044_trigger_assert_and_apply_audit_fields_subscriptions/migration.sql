-- Optimistic locking with version, and updated_at set on every update of the
-- subscriptions, like the other tables with audit fields.
CREATE TRIGGER assert_and_apply_audit_fields_on_update
BEFORE UPDATE ON subscription.subscriptions FOR EACH ROW
EXECUTE FUNCTION core.assert_and_apply_audit_fields ();
