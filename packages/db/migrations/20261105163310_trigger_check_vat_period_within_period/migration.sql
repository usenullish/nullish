-- A VAT period must fall entirely within an existing ledger period for the
-- same organization (guards the manual/migrated path; the generation trigger
-- already only creates VAT periods within the ledger period of the VAT methods).
CREATE OR REPLACE FUNCTION core.check_vat_period_within_ledger_period () RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM ledger.periods
    WHERE organization_id = NEW.organization_id
      AND daterange(start_on, end_on, '[]') @> daterange(NEW.start_on, NEW.end_on, '[]')
  ) THEN
    RAISE EXCEPTION
      'VAT period % to % has no covering ledger period for organization %',
      NEW.start_on, NEW.end_on, NEW.organization_id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_vat_period_within_ledger_period
BEFORE INSERT OR UPDATE ON core.vat_periods FOR EACH ROW
EXECUTE FUNCTION core.check_vat_period_within_ledger_period ();
