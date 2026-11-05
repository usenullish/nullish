-- base_currency can be freely changed until the organization has its
-- first invoice, since past invoices/postings depend on it for their
-- exchange-rate calculations. Once real transactions exist, it's locked.
CREATE OR REPLACE FUNCTION core.check_accounting_settings_base_currency_immutable () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.base_currency != OLD.base_currency
     AND EXISTS (SELECT 1 FROM billing.invoices WHERE organization_id = OLD.organization_id)
  THEN
    RAISE EXCEPTION 'base_currency cannot be changed once the organization has invoices (row %)', OLD.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_accounting_settings_base_currency_immutable
BEFORE UPDATE ON core.accounting_settings FOR EACH ROW
EXECUTE FUNCTION core.check_accounting_settings_base_currency_immutable ();
