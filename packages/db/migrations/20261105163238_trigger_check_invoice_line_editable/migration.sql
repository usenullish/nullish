-- Invoice lines are only editable while the parent invoice is still a
-- draft. Once finalized (open/paid/uncollectible/void), no line can be
-- inserted, updated, or deleted.
CREATE OR REPLACE FUNCTION billing.check_line_editable () RETURNS TRIGGER AS $$
DECLARE
invoice_status billing.invoice_status;
BEGIN
  IF TG_OP = 'DELETE' AND NOT core.organization_exists(OLD.organization_id) THEN
    RETURN OLD;
  END IF;

SELECT status INTO invoice_status
FROM billing.invoices
WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

IF invoice_status != 'draft' THEN
    RAISE EXCEPTION 'Invoice % is % and its lines cannot be modified',
      COALESCE(NEW.invoice_id, OLD.invoice_id), invoice_status;
END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_line_editable
BEFORE INSERT OR UPDATE OR DELETE ON billing.lines FOR EACH ROW
EXECUTE FUNCTION billing.check_line_editable ();
