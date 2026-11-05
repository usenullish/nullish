-- Postings of a migrated journal entry cannot be added, modified or deleted, like their entry. The
-- migration inserts the entry first and its postings after, so adding a posting is only allowed in the
-- transaction that created the entry: its created_at is the start time of that transaction (now()).
CREATE OR REPLACE FUNCTION ledger.check_posting_immutable_if_migrated () RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT core.organization_exists(OLD.organization_id) THEN
    RETURN OLD;
  END IF;

  IF EXISTS (
    SELECT 1 FROM ledger.journal_entries
    WHERE id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id)
      AND migrated
      AND (TG_OP <> 'INSERT' OR created_at <> now())
  ) THEN
    RAISE EXCEPTION 'Posting % belongs to a migrated journal entry and cannot be added, modified or deleted',
      COALESCE(NEW.id, OLD.id)
      USING ERRCODE = 'R0001';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_posting_immutable_if_migrated
BEFORE INSERT OR UPDATE OR DELETE ON ledger.postings FOR EACH ROW
EXECUTE FUNCTION ledger.check_posting_immutable_if_migrated ();
