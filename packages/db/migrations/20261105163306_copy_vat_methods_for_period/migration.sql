-- On period open: the new fiscal year keeps the VAT methods of the previous year, if the
-- organization has any. Switching method for the new year is then an edit of its VAT methods.
-- Inserting the methods generates the VAT periods of the year (see core.generate_vat_periods_for_methods).
CREATE OR REPLACE FUNCTION ledger.copy_vat_methods_for_period () RETURNS trigger AS $$
BEGIN
INSERT INTO core.vat_methods (organization_id, period_id, remuneration_method, payment_method)
SELECT NEW.organization_id, NEW.id, m.remuneration_method, m.payment_method
FROM core.vat_methods m
JOIN ledger.periods p ON p.id = m.period_id
WHERE m.organization_id = NEW.organization_id AND p.start_on < NEW.start_on
ORDER BY p.start_on DESC
LIMIT 1;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER copy_vat_methods_after_period_open
AFTER INSERT ON ledger.periods FOR EACH ROW
EXECUTE FUNCTION ledger.copy_vat_methods_for_period ();
