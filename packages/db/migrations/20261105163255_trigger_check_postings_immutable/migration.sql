-- A posting can never be moved to a different journal entry, that
-- would silently break the balance guarantee for both entries involved.
CREATE OR REPLACE FUNCTION ledger.check_postings_journal_entry_immutable () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.journal_entry_id != OLD.journal_entry_id THEN
    RAISE EXCEPTION 'journal_entry_id cannot be changed once set (row %)', OLD.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_postings_journal_entry_immutable
BEFORE UPDATE ON ledger.postings FOR EACH ROW
EXECUTE FUNCTION ledger.check_postings_journal_entry_immutable ();
