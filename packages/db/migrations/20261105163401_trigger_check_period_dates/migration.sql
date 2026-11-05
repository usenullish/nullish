-- The dates of a period can only change when what is booked in it still fits:
-- - no journal entry of the period falls outside the new dates;
-- - none of its VAT periods is closed, since its VAT periods follow the new dates (see
--   core.regenerate_vat_periods_for_period_dates) and a closed one cannot be deleted;
-- - without VAT methods its VAT periods are not generated again, so none may fall outside the new dates.
CREATE OR REPLACE FUNCTION ledger.check_period_dates () RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM ledger.journal_entries
    WHERE organization_id = NEW.organization_id
      AND valid_on BETWEEN OLD.start_on AND OLD.end_on
      AND NOT valid_on BETWEEN NEW.start_on AND NEW.end_on
  ) THEN
    RAISE EXCEPTION 'Period % has journal entries outside % to %', NEW.id, NEW.start_on, NEW.end_on
      USING ERRCODE = 'R0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM core.vat_periods
    WHERE organization_id = NEW.organization_id
      AND start_on >= OLD.start_on
      AND end_on <= OLD.end_on
      AND status = 'closed'
  ) THEN
    RAISE EXCEPTION 'Period % has closed VAT periods and its dates cannot change', NEW.id
      USING ERRCODE = 'R0001';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM core.vat_methods WHERE period_id = NEW.id)
    AND EXISTS (
      SELECT 1
      FROM core.vat_periods
      WHERE organization_id = NEW.organization_id
        AND start_on >= OLD.start_on
        AND end_on <= OLD.end_on
        AND NOT daterange(NEW.start_on, NEW.end_on, '[]') @> daterange(start_on, end_on, '[]')
    ) THEN
    RAISE EXCEPTION 'Period % has VAT periods outside % to %', NEW.id, NEW.start_on, NEW.end_on
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_period_dates
BEFORE UPDATE OF start_on,
end_on ON ledger.periods FOR EACH ROW WHEN (
  OLD.start_on IS DISTINCT FROM NEW.start_on
  OR OLD.end_on IS DISTINCT FROM NEW.end_on
)
EXECUTE FUNCTION ledger.check_period_dates ();
