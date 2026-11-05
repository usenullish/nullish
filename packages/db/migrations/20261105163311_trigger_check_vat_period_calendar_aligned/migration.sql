-- A VAT period must fall within a single calendar period of the VAT payment
-- method of its fiscal year: net_rate = calendar semester (Jan-Jun, Jul-Dec),
-- effective = calendar quarter. Fiscal years without VAT methods have no
-- method to check against and are skipped.
CREATE OR REPLACE FUNCTION core.check_vat_period_calendar_aligned () RETURNS trigger AS $$
DECLARE
  v_payment_method core.vat_payment_method;
  v_months int;
BEGIN
  SELECT m.payment_method INTO v_payment_method
  FROM core.vat_methods m
  JOIN ledger.periods p ON p.id = m.period_id
  WHERE m.organization_id = NEW.organization_id
    AND NEW.start_on BETWEEN p.start_on AND p.end_on;

  IF v_payment_method IS NULL THEN
    RETURN NEW;
  END IF;

  v_months := CASE v_payment_method
    WHEN 'net_rate' THEN 6
    WHEN 'effective' THEN 3
  END;

  IF v_months IS NULL THEN
    RAISE EXCEPTION 'Unsupported VAT payment method: %', v_payment_method;
  END IF;

  IF extract(year FROM NEW.start_on) <> extract(year FROM NEW.end_on)
    OR (extract(month FROM NEW.start_on)::int - 1) / v_months
      <> (extract(month FROM NEW.end_on)::int - 1) / v_months THEN
    RAISE EXCEPTION
      'VAT period % to % must fall within a single %-month calendar period for organization %',
      NEW.start_on, NEW.end_on, v_months, NEW.organization_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_vat_period_calendar_aligned
BEFORE INSERT OR UPDATE ON core.vat_periods FOR EACH ROW
EXECUTE FUNCTION core.check_vat_period_calendar_aligned ();
