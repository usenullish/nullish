-- On period dates change: with VAT methods, the VAT periods of the fiscal year follow the new dates,
-- so they are deleted and generated again, as on payment method change (see
-- core.regenerate_vat_periods_for_methods). ledger.check_period_dates ensures none of them is closed.
CREATE OR REPLACE FUNCTION core.regenerate_vat_periods_for_period_dates () RETURNS trigger AS $$
DECLARE
  v_payment_method core.vat_payment_method;
BEGIN
  SELECT payment_method INTO v_payment_method
  FROM core.vat_methods
  WHERE period_id = NEW.id;

  IF v_payment_method IS NULL THEN
    RETURN NEW;
  END IF;

  DELETE FROM core.vat_periods
  WHERE organization_id = NEW.organization_id
    AND start_on >= OLD.start_on
    AND end_on <= OLD.end_on;

  PERFORM core.generate_vat_periods(NEW.organization_id, NEW.start_on, v_payment_method, NEW.end_on);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER regenerate_vat_periods_after_period_dates_update
AFTER UPDATE OF start_on,
end_on ON ledger.periods FOR EACH ROW WHEN (
  OLD.start_on IS DISTINCT FROM NEW.start_on
  OR OLD.end_on IS DISTINCT FROM NEW.end_on
)
EXECUTE FUNCTION core.regenerate_vat_periods_for_period_dates ();
