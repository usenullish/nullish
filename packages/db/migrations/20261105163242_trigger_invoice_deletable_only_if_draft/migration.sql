-- Only draft invoices can be deleted. Once
-- finalized (open/paid/uncollectible/void), delete is blocked entirely,
-- correction happens by voiding, not deleting.
CREATE OR REPLACE FUNCTION billing.check_invoice_deletable_only_if_draft () RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT core.organization_exists(OLD.organization_id) THEN
    RETURN OLD;
  END IF;

  IF OLD.status != 'draft' THEN
    RAISE EXCEPTION 'Invoice % is % and cannot be deleted', OLD.id, OLD.status;
END IF;

RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_invoice_deletable_only_if_draft
BEFORE DELETE ON billing.invoices FOR EACH ROW
EXECUTE FUNCTION billing.check_invoice_deletable_only_if_draft ();
