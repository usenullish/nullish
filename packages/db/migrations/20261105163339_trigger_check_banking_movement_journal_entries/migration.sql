-- A movement can only be reconciled with journal entries of its own organization.
CREATE OR REPLACE FUNCTION banking.check_movement_journal_entry_organization () RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM banking.movements m
    JOIN ledger.journal_entries e ON e.organization_id = m.organization_id
    WHERE m.id = NEW.movement_id
      AND e.id = NEW.journal_entry_id
  ) THEN
    RAISE EXCEPTION 'Journal entry % does not belong to the organization of bank movement %',
      NEW.journal_entry_id, NEW.movement_id
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_movement_journal_entry_organization
BEFORE INSERT ON banking.movement_journal_entries FOR EACH ROW
EXECUTE FUNCTION banking.check_movement_journal_entry_organization ();

-- This row records a fact (this movement is reconciled with this journal entry), never something to
-- edit afterward.
CREATE OR REPLACE FUNCTION banking.check_movement_journal_entries_immutable () RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Row % cannot be modified once created', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_movement_journal_entries_immutable
BEFORE UPDATE ON banking.movement_journal_entries FOR EACH ROW
EXECUTE FUNCTION banking.check_movement_journal_entries_immutable ();
