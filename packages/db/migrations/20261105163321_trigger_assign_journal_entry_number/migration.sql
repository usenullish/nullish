-- A journal entry gets its number at insert: the next one in the series
-- of its organization. The number cannot be changed afterwards.
CREATE OR REPLACE FUNCTION ledger.assign_journal_entry_number () RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Inserts of the same organization wait for each other until the transaction ends,
    -- so that two of them cannot read the same highest number.
    PERFORM pg_advisory_xact_lock(hashtextextended('ledger.journal_entries.number:' || NEW.organization_id::text, 0));

    SELECT COALESCE(MAX(e.number), 0) + 1 INTO NEW.number
    FROM ledger.journal_entries e
    WHERE e.organization_id = NEW.organization_id;

    RETURN NEW;
END IF;

  IF NEW.number IS DISTINCT FROM OLD.number THEN
    RAISE EXCEPTION 'number cannot be changed (row %)', OLD.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assign_journal_entry_number
BEFORE INSERT OR UPDATE ON ledger.journal_entries FOR EACH ROW
EXECUTE FUNCTION ledger.assign_journal_entry_number ();
