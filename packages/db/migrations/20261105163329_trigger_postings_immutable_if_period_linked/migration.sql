-- Postings linked to a period through journal entry should not be added, edited or deleted directly
-- to avoid getting out of sync with the closing of the period. The closing service inserts the
-- postings before linking their journal entry, so inserting is only refused once the entry is linked.
CREATE OR REPLACE FUNCTION ledger.check_posting_immutable_if_period_linked () RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT core.organization_exists(OLD.organization_id) THEN
    RETURN OLD;
  END IF;

  IF EXISTS (
    SELECT 1 FROM ledger.period_journal_entries
    WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id)
  ) THEN
    RAISE EXCEPTION 'Posting % belongs to a journal entry booked by the closing of a period and cannot be added, modified or deleted directly',
      COALESCE(NEW.id, OLD.id)
      USING ERRCODE = 'R0001';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_posting_immutable_if_period_linked
BEFORE INSERT OR UPDATE OR DELETE ON ledger.postings FOR EACH ROW
EXECUTE FUNCTION ledger.check_posting_immutable_if_period_linked ();
