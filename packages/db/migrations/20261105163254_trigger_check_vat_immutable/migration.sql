-- The VAT methods of a fiscal year can be freely changed until an invoice or a journal entry of that
-- year uses VAT, since they were booked with the methods that applied at the time.
CREATE OR REPLACE FUNCTION core.check_vat_methods_immutable () RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.remuneration_method != OLD.remuneration_method OR NEW.payment_method != OLD.payment_method)
     AND (EXISTS (
       SELECT 1
       FROM billing.invoices i
       JOIN ledger.periods p ON p.id = OLD.period_id
       WHERE i.organization_id = OLD.organization_id
         AND i.vat_rate_id IS NOT NULL
         AND i.issue_on BETWEEN p.start_on AND p.end_on
     ) OR EXISTS (
       SELECT 1
       FROM ledger.postings po
       JOIN ledger.journal_entries j ON j.id = po.journal_entry_id
       JOIN ledger.periods p ON p.id = OLD.period_id
       WHERE po.organization_id = OLD.organization_id
         AND po.vat_rate_id IS NOT NULL
         AND j.valid_on BETWEEN p.start_on AND p.end_on
     ))
  THEN
    RAISE EXCEPTION 'remuneration_method/payment_method cannot be changed once invoices or journal entries of the period use VAT (row %)', OLD.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_vat_methods_immutable
BEFORE UPDATE ON core.vat_methods FOR EACH ROW
EXECUTE FUNCTION core.check_vat_methods_immutable ();

-- Once any invoice has actually used this rate, its type/rate/netRate are
-- locked, historical VAT calculations depend on the exact value that applied at the time.
CREATE OR REPLACE FUNCTION core.check_vat_rates_immutable () RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.type != OLD.type OR NEW.rate != OLD.rate OR NEW.net_rate IS DISTINCT FROM OLD.net_rate)
     AND EXISTS (SELECT 1 FROM billing.invoices WHERE vat_rate_id = OLD.id)
  THEN
    RAISE EXCEPTION 'type/rate/netRate cannot be changed once an invoice uses this rate (row %)', OLD.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_vat_rates_immutable
BEFORE UPDATE ON core.vat_rates FOR EACH ROW
EXECUTE FUNCTION core.check_vat_rates_immutable ();
