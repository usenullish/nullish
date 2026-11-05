-- Seed the vat_rates templates of a payment method the first time a fiscal year of the organization
-- uses it, e.g. the sales, input and import tax when switching from the net rate to the effective
-- method. A new year that keeps the method of the previous one seeds nothing, so the rates deleted on
-- purpose do not come back. A template the organization already has (same code and start) is skipped.
CREATE OR REPLACE FUNCTION core.seed_payment_method_vat_rates () RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.payment_method = OLD.payment_method THEN
    RETURN NEW;
END IF;

  IF EXISTS (
    SELECT 1
    FROM core.vat_methods
    WHERE organization_id = NEW.organization_id
      AND id <> NEW.id
      AND payment_method = NEW.payment_method
  ) THEN
    RETURN NEW;
END IF;

INSERT INTO core.vat_rates (organization_id, code, type, rate, start_on, end_on)
SELECT NEW.organization_id, t.code, t.type, t.rate, t.start_on, t.end_on
FROM templates.vat_rates t
WHERE t.payment_method = NEW.payment_method
  AND NOT EXISTS (
    SELECT 1
    FROM core.vat_rates r
    WHERE r.organization_id = NEW.organization_id
      AND r.code = t.code
      AND r.start_on = t.start_on
  );

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seed_payment_method_vat_rates_after_methods_change
AFTER INSERT OR UPDATE OF payment_method ON core.vat_methods FOR EACH ROW
EXECUTE FUNCTION core.seed_payment_method_vat_rates ();
