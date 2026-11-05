-- An invoice's client can never change once created.
CREATE OR REPLACE FUNCTION billing.check_invoices_client_immutable () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_id != OLD.client_id THEN
    RAISE EXCEPTION 'client_id cannot be changed once set (row %)', OLD.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_invoices_client_immutable
BEFORE UPDATE ON billing.invoices FOR EACH ROW
EXECUTE FUNCTION billing.check_invoices_client_immutable ();
