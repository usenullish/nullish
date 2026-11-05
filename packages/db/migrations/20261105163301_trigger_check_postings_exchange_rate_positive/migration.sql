-- exchange_rate must always be a positive number.
CREATE OR REPLACE FUNCTION ledger.check_postings_exchange_rate_positive () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.exchange_rate IS NULL OR NEW.exchange_rate <= 0 THEN
    RAISE EXCEPTION 'exchange_rate must be greater than 0 (posting ID: %, rate: %)', NEW.id, NEW.exchange_rate
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_postings_exchange_rate_positive
BEFORE INSERT OR UPDATE ON ledger.postings FOR EACH ROW
EXECUTE FUNCTION ledger.check_postings_exchange_rate_positive ();
