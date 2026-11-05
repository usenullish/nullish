-- Once a period is closed (end_on is set), the row becomes fully immutable.
CREATE OR REPLACE FUNCTION ledger.check_period_immutable_once_closed () RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT core.organization_exists(OLD.organization_id) THEN
    RETURN OLD;
  END IF;

  IF OLD.status = 'closed' THEN
    RAISE EXCEPTION 'Period % is closed and cannot be modified or deleted', OLD.id;
END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_period_immutable_once_closed
BEFORE UPDATE OR DELETE ON ledger.periods FOR EACH ROW
EXECUTE FUNCTION ledger.check_period_immutable_once_closed ();
