-- Once a VAT period is closed, the row becomes fully immutable.
CREATE OR REPLACE FUNCTION core.check_vat_period_immutable_once_closed () RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT core.organization_exists(OLD.organization_id) THEN
    RETURN OLD;
  END IF;

  IF OLD.status = 'closed' THEN
    RAISE EXCEPTION 'VAT period % is closed and cannot be modified or deleted', OLD.id;
END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_vat_period_immutable_once_closed
BEFORE UPDATE OR DELETE ON core.vat_periods FOR EACH ROW
EXECUTE FUNCTION core.check_vat_period_immutable_once_closed ();
