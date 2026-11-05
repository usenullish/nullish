-- Postings linked to an invoice through journal entry should not be added, edited or deleted
-- directly to avoid getting out of sync with the invoice. The invoice services insert the postings
-- before linking their journal entry, so inserting is only refused once the entry is linked.
CREATE OR REPLACE FUNCTION ledger.check_posting_immutable_if_invoice_linked () RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT core.organization_exists(OLD.organization_id) THEN
    RETURN OLD;
  END IF;

  IF EXISTS (
    SELECT 1 FROM billing.invoice_journal_entries
    WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id)
  ) THEN
    RAISE EXCEPTION 'Posting % belongs to an invoice-linked journal entry and cannot be added, modified or deleted directly',
      COALESCE(NEW.id, OLD.id)
      USING ERRCODE = 'R0001';
END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_posting_immutable_if_invoice_linked
BEFORE INSERT OR UPDATE OR DELETE ON ledger.postings FOR EACH ROW
EXECUTE FUNCTION ledger.check_posting_immutable_if_invoice_linked ();
