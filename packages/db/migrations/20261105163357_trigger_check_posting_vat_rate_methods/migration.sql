-- A posting with a VAT rate is booked with the VAT methods of its fiscal year: the year must have
-- VAT methods, and the type of the rate must be allowed with their payment method. For example,
-- input tax (VM81) only exists with the effective method and the net rate tax only with the net
-- rate method.
--
-- The rule is checked when a posting gets its rate or its entry, and again when the date of the entry
-- changes, since the entry may then fall in a year with other VAT methods. That second check is DEFERRED:
-- the engine updates the entry before its postings, so an edit of both the date and the rates is checked
-- once its postings are final.
CREATE OR REPLACE FUNCTION ledger.assert_vat_rate_methods (
  p_organization_id uuid,
  p_vat_rate_id uuid,
  p_valid_on date
) RETURNS void AS $$
DECLARE
  v_type core.vat_type;
  v_code text;
  v_payment_method core.vat_payment_method;
BEGIN
  SELECT type, code INTO v_type, v_code
  FROM core.vat_rates
  WHERE id = p_vat_rate_id;

  SELECT m.payment_method INTO v_payment_method
  FROM core.vat_methods m
  JOIN ledger.periods p ON p.id = m.period_id
  WHERE m.organization_id = p_organization_id
    AND p_valid_on BETWEEN p.start_on AND p.end_on;

  IF v_payment_method IS NULL THEN
    RAISE EXCEPTION 'VAT rate % is used on % but the organization has no VAT methods for that date', v_code, p_valid_on
      USING ERRCODE = 'R0001';
  END IF;

  IF NOT (CASE v_type
    WHEN 'net_rate_tax' THEN v_payment_method = 'net_rate'
    WHEN 'sales_tax_due' THEN v_payment_method = 'effective'
    WHEN 'input_tax_materials' THEN v_payment_method = 'effective'
    WHEN 'input_tax_investments' THEN v_payment_method = 'effective'
    WHEN 'import_tax_materials' THEN v_payment_method = 'effective'
    WHEN 'import_tax_investments' THEN v_payment_method = 'effective'
    ELSE true
  END) THEN
    RAISE EXCEPTION 'VAT rate % (%) is not supported with the % payment method', v_code, v_type, v_payment_method
      USING ERRCODE = 'R0001';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ledger.check_posting_vat_rate_methods () RETURNS TRIGGER AS $$
DECLARE
  v_valid_on date;
BEGIN
  IF NEW.vat_rate_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT valid_on INTO v_valid_on
  FROM ledger.journal_entries
  WHERE id = NEW.journal_entry_id;

  PERFORM ledger.assert_vat_rate_methods(NEW.organization_id, NEW.vat_rate_id, v_valid_on);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ledger.check_journal_entry_vat_rate_methods () RETURNS TRIGGER AS $$
BEGIN
  PERFORM ledger.assert_vat_rate_methods(p.organization_id, p.vat_rate_id, e.valid_on)
  FROM ledger.journal_entries e
  JOIN ledger.postings p ON p.journal_entry_id = e.id
  WHERE e.id = NEW.id
    AND p.vat_rate_id IS NOT NULL;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_posting_vat_rate_methods
BEFORE INSERT OR UPDATE OF vat_rate_id,
journal_entry_id ON ledger.postings FOR EACH ROW
EXECUTE FUNCTION ledger.check_posting_vat_rate_methods ();

CREATE CONSTRAINT TRIGGER enforce_posting_vat_rate_methods_on_valid_on
AFTER UPDATE OF valid_on ON ledger.journal_entries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (OLD.valid_on IS DISTINCT FROM NEW.valid_on)
EXECUTE FUNCTION ledger.check_journal_entry_vat_rate_methods ();
