-- A movement is reconciled exactly when it is linked to journal entries, and those entries then move the
-- ledger account of its bank relation by its amount (debit minus credit, money in being positive) in its
-- currency, so that the ledger follows the bank. An unreconciled or ignored movement is linked to no journal entry.
--
-- DEFERRED because the status of a movement and its links are written as separate rows in the same
-- transaction.
CREATE OR REPLACE FUNCTION banking.check_movement_reconciled () RETURNS TRIGGER AS $$
DECLARE
  affected_movement_id uuid;
  movement record;
  links integer;
  booked numeric;
BEGIN
  IF TG_TABLE_NAME = 'movements' THEN
    affected_movement_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    affected_movement_id := OLD.movement_id;
  ELSE
    affected_movement_id := NEW.movement_id;
  END IF;

  SELECT m.status, m.amount, m.currency, b.account_id
  INTO movement
  FROM banking.movements m
  JOIN core.bank_relations b ON b.id = m.bank_relation_id
  WHERE m.id = affected_movement_id;

  -- The movement was deleted in the same transaction.
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO links
  FROM banking.movement_journal_entries
  WHERE movement_id = affected_movement_id;

  IF movement.status <> 'reconciled' THEN
    IF links > 0 THEN
      RAISE EXCEPTION 'Bank movement % is % but linked to journal entries',
        affected_movement_id, movement.status
        USING ERRCODE = 'R0001';
    END IF;

    RETURN NULL;
  END IF;

  IF links = 0 THEN
    RAISE EXCEPTION 'Bank movement % is reconciled but linked to no journal entry',
      affected_movement_id
      USING ERRCODE = 'R0001';
  END IF;

  SELECT COALESCE(SUM(p.debit - p.credit), 0) INTO booked
  FROM ledger.postings p
  WHERE p.account_id = movement.account_id
    AND p.currency = movement.currency
    AND p.journal_entry_id IN (
      SELECT journal_entry_id FROM banking.movement_journal_entries
      WHERE movement_id = affected_movement_id
    );

  IF booked <> movement.amount THEN
    RAISE EXCEPTION 'Bank movement % of % % is reconciled with journal entries booking % on the ledger account of its bank account',
      affected_movement_id, movement.amount, movement.currency, booked
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER enforce_movement_reconciled_on_status
AFTER INSERT OR UPDATE OF status ON banking.movements
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION banking.check_movement_reconciled ();

CREATE CONSTRAINT TRIGGER enforce_movement_reconciled_on_link
AFTER INSERT OR DELETE ON banking.movement_journal_entries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION banking.check_movement_reconciled ();
