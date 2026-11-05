-- If a posting's currency matches its organization's base currency
-- (derived via its journal entry), the exchange rate must be exactly 1.
CREATE OR REPLACE FUNCTION ledger.check_postings_base_currency_rate () RETURNS TRIGGER AS $$
DECLARE
v_base_currency text;
BEGIN
SELECT s.base_currency INTO v_base_currency
FROM ledger.journal_entries je
         JOIN core.accounting_settings s ON s.organization_id = je.organization_id
WHERE je.id = NEW.journal_entry_id;

IF v_base_currency IS NULL THEN
    RAISE EXCEPTION 'Accounting settings or base currency not found for journal entry %', NEW.journal_entry_id;
END IF;

  IF NEW.currency = v_base_currency AND NEW.exchange_rate != 1 THEN
    RAISE EXCEPTION 'exchange_rate must be 1 when currency (%) matches base currency (%)', NEW.currency, v_base_currency
      USING ERRCODE = 'R0001';
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_postings_base_currency_rate
BEFORE INSERT OR UPDATE ON ledger.postings FOR EACH ROW
EXECUTE FUNCTION ledger.check_postings_base_currency_rate ();
