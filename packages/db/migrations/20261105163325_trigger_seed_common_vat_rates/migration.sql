-- When the first VAT methods of an organization are created, seed the vat_rates templates common to
-- both payment methods (e.g. CEX, SPE, BZM81), unless the organization already has rates.
-- ⚠️ This trigger must fire before seed_payment_method_vat_rates_after_methods_change, which seeds rates
-- too: Postgres fires the triggers of a table in the alphabetical order of their names.
CREATE OR REPLACE FUNCTION core.seed_common_vat_rates () RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM core.vat_rates WHERE organization_id = NEW.organization_id) THEN
    RETURN NEW;
END IF;

INSERT INTO core.vat_rates (organization_id, code, type, rate, start_on, end_on)
SELECT NEW.organization_id, t.code, t.type, t.rate, t.start_on, t.end_on
FROM templates.vat_rates t
WHERE t.payment_method IS NULL;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seed_common_vat_rates_after_methods_insert
AFTER INSERT ON core.vat_methods FOR EACH ROW
EXECUTE FUNCTION core.seed_common_vat_rates ();
