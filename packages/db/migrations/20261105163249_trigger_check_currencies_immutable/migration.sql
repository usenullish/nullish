-- A currency's decimal precision never changes once set,
-- everything downstream (amount scaling, historical figures) depends on it.
-- (for simplicity reasons too, unless there was a typo by input, this should never change)
CREATE OR REPLACE FUNCTION core.check_currencies_decimals_immutable () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.decimals != OLD.decimals THEN
    RAISE EXCEPTION 'decimals cannot be changed once set (currency %)', OLD.code;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_currencies_decimals_immutable
BEFORE UPDATE ON core.currencies FOR EACH ROW
EXECUTE FUNCTION core.check_currencies_decimals_immutable ();
