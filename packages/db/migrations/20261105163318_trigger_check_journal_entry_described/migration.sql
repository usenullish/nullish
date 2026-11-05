-- Enforce that a journal entry can be traced back to what it books: it needs a reference or at least
-- one posting with a description. Entries linked to an invoice are exempt, the invoice documents them.
-- Entries linked to a period (its opening balance, its result) are exempt too, the link documents them.
-- Entries linked to a bank movement are exempt as well, the movement documents them.
-- An entry without any posting is not checked, as for the balance check.
--
-- DEFERRED for the same reason as the balance check: the postings of an entry are inserted as separate
-- rows, and the invoice services link the entry to its invoice after inserting it. The closing of a
-- period and the reconciliation of a bank movement link their entries the same way.
CREATE OR REPLACE FUNCTION ledger.check_journal_entry_described () RETURNS TRIGGER AS $$
DECLARE
  affected_entry_id uuid;
  entry_reference text;
BEGIN
  IF TG_TABLE_NAME = 'journal_entries' THEN
    affected_entry_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    affected_entry_id := OLD.journal_entry_id;
  ELSE
    affected_entry_id := NEW.journal_entry_id;
  END IF;

  SELECT reference INTO entry_reference
  FROM ledger.journal_entries
  WHERE id = affected_entry_id;

  -- The entry was deleted in the same transaction.
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF btrim(COALESCE(entry_reference, '')) <> '' THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ledger.postings
    WHERE journal_entry_id = affected_entry_id
  ) THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM billing.invoice_journal_entries
    WHERE journal_entry_id = affected_entry_id
  ) THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM ledger.period_journal_entries
    WHERE journal_entry_id = affected_entry_id
  ) THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM banking.movement_journal_entries
    WHERE journal_entry_id = affected_entry_id
  ) THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM ledger.postings
    WHERE journal_entry_id = affected_entry_id
      AND btrim(COALESCE(description, '')) <> ''
  ) THEN
    RETURN NULL;
  END IF;

  RAISE EXCEPTION 'Journal entry % needs a reference or at least one posting with a description',
    affected_entry_id
    USING ERRCODE = 'R0001';
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER enforce_journal_entry_described_on_postings
AFTER INSERT OR UPDATE OR DELETE ON ledger.postings
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION ledger.check_journal_entry_described ();

CREATE CONSTRAINT TRIGGER enforce_journal_entry_described_on_reference
AFTER UPDATE OF reference ON ledger.journal_entries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (OLD.reference IS DISTINCT FROM NEW.reference)
EXECUTE FUNCTION ledger.check_journal_entry_described ();

CREATE CONSTRAINT TRIGGER enforce_journal_entry_described_on_invoice_unlink
AFTER DELETE ON billing.invoice_journal_entries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION ledger.check_journal_entry_described ();

CREATE CONSTRAINT TRIGGER enforce_journal_entry_described_on_period_unlink
AFTER DELETE ON ledger.period_journal_entries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION ledger.check_journal_entry_described ();

CREATE CONSTRAINT TRIGGER enforce_journal_entry_described_on_movement_unlink
AFTER DELETE ON banking.movement_journal_entries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION ledger.check_journal_entry_described ();
