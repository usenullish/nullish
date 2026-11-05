-- Every new invoice must be created with status draft.
CREATE OR REPLACE FUNCTION billing.check_new_invoice_is_draft () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'New invoices must be created with status draft';
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_new_invoice_is_draft
BEFORE INSERT ON billing.invoices FOR EACH ROW
EXECUTE FUNCTION billing.check_new_invoice_is_draft ();
