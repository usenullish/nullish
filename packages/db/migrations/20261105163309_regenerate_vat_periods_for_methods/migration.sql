-- On payment method change: the VAT periods of the fiscal year follow the new method (semesters
-- or quarters), so they are deleted and generated again. A closed VAT period cannot be deleted (see
-- core.check_vat_period_immutable_once_closed), so a year already declared cannot change method.
CREATE OR REPLACE FUNCTION core.regenerate_vat_periods_for_methods () RETURNS trigger AS $$
DECLARE
v_period_start date;
  v_period_end date;
BEGIN
SELECT start_on, end_on INTO v_period_start, v_period_end
FROM ledger.periods
WHERE id = NEW.period_id;

DELETE FROM core.vat_periods
WHERE organization_id = NEW.organization_id
  AND start_on >= v_period_start
  AND end_on <= v_period_end;

  PERFORM core.generate_vat_periods(NEW.organization_id, v_period_start, NEW.payment_method, v_period_end);
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER regenerate_vat_periods_after_methods_update
AFTER UPDATE OF payment_method ON core.vat_methods FOR EACH ROW WHEN (
  NEW.payment_method IS DISTINCT FROM OLD.payment_method
)
EXECUTE FUNCTION core.regenerate_vat_periods_for_methods ();
