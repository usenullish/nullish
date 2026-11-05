-- On VAT methods insert: generate the VAT periods of their fiscal year with its payment method,
-- capped at the ledger period's end (existing/overlapping periods are silently skipped, see
-- core.generate_vat_periods).
CREATE OR REPLACE FUNCTION core.generate_vat_periods_for_methods () RETURNS trigger AS $$
DECLARE
v_period_start date;
  v_period_end date;
BEGIN
SELECT start_on, end_on INTO v_period_start, v_period_end
FROM ledger.periods
WHERE id = NEW.period_id;

  PERFORM core.generate_vat_periods(NEW.organization_id, v_period_start, NEW.payment_method, v_period_end);
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_vat_periods_after_methods_insert
AFTER INSERT ON core.vat_methods FOR EACH ROW
EXECUTE FUNCTION core.generate_vat_periods_for_methods ();
