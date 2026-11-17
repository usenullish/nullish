-- Records every insert, update and delete of the subscriptions in the audit
-- logs, like the other business tables, so that each change of an
-- organization's subscription can be traced.
CREATE TRIGGER audit_log_trigger
AFTER INSERT OR UPDATE OR DELETE ON subscription.subscriptions FOR EACH ROW
EXECUTE FUNCTION audit.log_changes ();
