-- Every journal entry line that uses an input tax, acquisition tax, sales tax or net rate tax rate must
-- come with its VAT lines.
--
-- When the user books such a line, the engine adds two lines to the same entry and links them to it in
-- ledger.posting_manual_vat_postings: one debit and one credit of the same amount, the tax, rounded to the
-- cent (a difference of one cent is tolerated). When the tax rounds to zero, no line is added.
--
-- Input tax: the user's line is the gross amount, VAT included, so the tax is 8.1 / 108.1 of it.
-- e.g. an expense of 108.10 with VM81 (8.1%) comes with two VAT lines of 8.10.
--
-- Acquisition tax (Bezugsteuer): the user's line is the purchase, without VAT, so the tax is 8.1% of it.
-- e.g. a purchase of 100.00 with BZM81 (8.1%) comes with two VAT lines of 8.10.
--
-- Sales tax: the user's line is the gross amount, VAT included, so the tax is 8.1 / 108.1 of it.
-- e.g. an income of 108.10 with UN81 (8.1%) comes with two VAT lines of 8.10.
--
-- Net rate tax: the user's line is the gross amount, VAT included, and the tax is the net rate granted
-- by the tax administration applied to it, as when an invoice is opened.
-- e.g. an income of 108.10 with a net rate of 6.2% comes with two VAT lines of 6.70.
--
-- The entries of an invoice (opening, payment, void, write-off) are not checked for sales tax and net
-- rate tax: their revenue line carries the rate, but the invoice books its VAT itself, without VAT
-- lines linked to it.
--
-- Migrated entries (e.g. from Bexio) are not checked either: they book what the previous tool booked,
-- its VAT lines included, as plain lines that are not linked to the line they come from.
--
-- The accounts and sides of the VAT lines depend on the VAT method of the organization and are chosen
-- by the engine, this rule only checks that the lines are there and that their amount is right.
-- A VAT line must also belong to the same journal entry as the line it comes from.
--
-- This must be a DEFERRED constraint trigger, like the balance check: the lines of an entry and their
-- links are inserted as separate rows, the VAT lines and the links after the user's line.
--
-- It also runs when an entry is unlinked from its invoice: the entry is then checked as any other, its
-- sales tax and net rate tax lines included.
CREATE OR REPLACE FUNCTION ledger.check_journal_vat_postings () RETURNS TRIGGER AS $$
DECLARE
  affected_entry_id uuid;
  invalid_vat_code text;
BEGIN
  IF TG_TABLE_NAME = 'postings' THEN
    affected_entry_id := COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
  ELSIF TG_TABLE_NAME = 'invoice_journal_entries' THEN
    affected_entry_id := OLD.journal_entry_id;
  ELSE
    SELECT journal_entry_id INTO affected_entry_id
    FROM ledger.postings
    WHERE id = COALESCE(NEW.posting_id, OLD.posting_id);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM ledger.posting_manual_vat_postings l
    JOIN ledger.postings s ON s.id = l.posting_id
    JOIN ledger.postings v ON v.id = l.vat_posting_id
    WHERE (s.journal_entry_id = affected_entry_id OR v.journal_entry_id = affected_entry_id)
      AND s.journal_entry_id <> v.journal_entry_id
  ) THEN
    RAISE EXCEPTION 'Journal entry % has a VAT posting linked to a posting of another entry',
      affected_entry_id
      USING ERRCODE = 'R0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM ledger.journal_entries WHERE id = affected_entry_id AND migrated
  ) THEN
    RETURN NULL;
  END IF;

  WITH sources AS (
    SELECT
      p.id,
      vr.code,
      CASE
        WHEN vr.type IN ('input_tax_materials', 'input_tax_investments', 'sales_tax_due')
          THEN ROUND(GREATEST(p.debit, p.credit) * vr.rate / (100 + vr.rate))
        WHEN vr.type = 'net_rate_tax'
          THEN ROUND(GREATEST(p.debit, p.credit) * vr.net_rate / 100)
        ELSE ROUND(GREATEST(p.debit, p.credit) * vr.rate / 100)
      END AS expected_tax
    FROM ledger.postings p
    JOIN core.vat_rates vr ON vr.id = p.vat_rate_id
    WHERE p.journal_entry_id = affected_entry_id
      AND (
        vr.type IN (
          'input_tax_materials',
          'input_tax_investments',
          'acquisition_tax_materials',
          'acquisition_tax_investments'
        )
        OR (
          vr.type IN ('sales_tax_due', 'net_rate_tax')
          AND NOT EXISTS (
            SELECT 1 FROM billing.invoice_journal_entries i WHERE i.journal_entry_id = affected_entry_id
          )
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM ledger.posting_manual_vat_postings l WHERE l.vat_posting_id = p.id
      )
  ),
  vat_lines AS (
    SELECT
      s.id,
      count(v.id) AS lines,
      COALESCE(SUM(v.debit), 0) AS debit,
      COALESCE(SUM(v.credit), 0) AS credit,
      count(v.id) FILTER (WHERE v.debit > 0) AS debit_lines
    FROM sources s
    LEFT JOIN ledger.posting_manual_vat_postings l ON l.posting_id = s.id
    LEFT JOIN ledger.postings v ON v.id = l.vat_posting_id
    GROUP BY s.id
  )
  SELECT s.code
  INTO invalid_vat_code
  FROM sources s
  JOIN vat_lines v ON v.id = s.id
  WHERE NOT (
    (s.expected_tax = 0 AND v.lines = 0)
    OR (
      v.lines = 2
      AND v.debit_lines = 1
      AND v.debit = v.credit
      AND abs(v.debit - s.expected_tax) <= 1
    )
  )
  LIMIT 1;

  IF invalid_vat_code IS NOT NULL THEN
    RAISE EXCEPTION 'Journal entry % does not book the VAT of rate % as expected',
      affected_entry_id, invalid_vat_code
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER enforce_journal_vat_postings
AFTER INSERT OR UPDATE OR DELETE ON ledger.postings
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION ledger.check_journal_vat_postings ();

CREATE CONSTRAINT TRIGGER enforce_journal_vat_postings
AFTER INSERT OR UPDATE OR DELETE ON ledger.posting_manual_vat_postings
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION ledger.check_journal_vat_postings ();

CREATE CONSTRAINT TRIGGER enforce_journal_vat_postings
AFTER DELETE ON billing.invoice_journal_entries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION ledger.check_journal_vat_postings ();
