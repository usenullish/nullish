-- exchange_rate must always be a positive number.
CREATE OR REPLACE FUNCTION billing.check_invoices_exchange_rate_positive () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.exchange_rate IS NULL OR NEW.exchange_rate <= 0 THEN
    RAISE EXCEPTION 'exchange_rate must be greater than 0 (invoice ID: %, rate: %)', NEW.id, NEW.exchange_rate;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_invoices_exchange_rate_positive
BEFORE INSERT OR UPDATE ON billing.invoices FOR EACH ROW
EXECUTE FUNCTION billing.check_invoices_exchange_rate_positive ();
