-- An invoice gets its number when it leaves draft: the next one in the
-- series of its client. The number cannot be set or changed otherwise.
CREATE OR REPLACE FUNCTION billing.assign_invoice_number () RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'draft' AND NEW.status != 'draft' THEN
    PERFORM 1 FROM billing.clients c WHERE c.id = NEW.client_id FOR NO KEY UPDATE;

    SELECT COALESCE(MAX(i.number), 0) + 1 INTO NEW.number
    FROM billing.invoices i
    WHERE i.client_id = NEW.client_id;

    RETURN NEW;
END IF;

  IF NEW.number IS DISTINCT FROM OLD.number THEN
    RAISE EXCEPTION 'number cannot be changed (row %)', OLD.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assign_invoice_number
BEFORE UPDATE ON billing.invoices FOR EACH ROW
EXECUTE FUNCTION billing.assign_invoice_number ();
