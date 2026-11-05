-- If an invoice's currency matches its organization's base currency,
-- the exchange rate must be exactly 1.
CREATE OR REPLACE FUNCTION billing.check_invoices_base_currency_rate () RETURNS TRIGGER AS $$
DECLARE
v_base_currency text;
BEGIN
SELECT s.base_currency INTO v_base_currency
FROM core.accounting_settings s
WHERE s.organization_id = NEW.organization_id;

IF v_base_currency IS NULL THEN
    RAISE EXCEPTION 'Accounting settings not found for organization %', NEW.organization_id;
END IF;

  IF NEW.currency = v_base_currency AND NEW.exchange_rate != 1 THEN
    RAISE EXCEPTION 'exchange_rate must be 1 when currency (%) matches base currency (%)', NEW.currency, v_base_currency;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_invoices_base_currency_rate
BEFORE INSERT OR UPDATE ON billing.invoices FOR EACH ROW
EXECUTE FUNCTION billing.check_invoices_base_currency_rate ();
