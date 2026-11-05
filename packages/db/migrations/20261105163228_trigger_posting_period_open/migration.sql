-- A posting can only be inserted, modified, or deleted if its journal
-- entry's date falls within an OPEN period for its organization. A date
-- with no matching period at all is rejected, same as a closed period.
CREATE OR REPLACE FUNCTION ledger.check_posting_period_open () RETURNS TRIGGER AS $$
DECLARE
target_entry_id uuid := COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
  target_org_id uuid;
  target_valid_on date;
  matched_status ledger.period_status;
BEGIN
  IF TG_OP = 'DELETE' AND NOT core.organization_exists(OLD.organization_id) THEN
    RETURN OLD;
  END IF;

SELECT organization_id, valid_on INTO target_org_id, target_valid_on
FROM ledger.journal_entries
WHERE id = target_entry_id;

SELECT status INTO matched_status
FROM ledger.periods
WHERE organization_id = target_org_id
  AND start_on <= target_valid_on
  AND target_valid_on <= end_on
    LIMIT 1;

IF NOT FOUND THEN
    RAISE EXCEPTION 'No period covers date % for organization %', target_valid_on, target_org_id
      USING ERRCODE = 'R0001';
END IF;

  IF matched_status = 'closed' THEN
    RAISE EXCEPTION 'Posting % belongs to a journal entry in a closed period and cannot be inserted, modified, or deleted',
      COALESCE(NEW.id, OLD.id)
      USING ERRCODE = 'R0001';
END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_posting_period_open
BEFORE INSERT OR UPDATE OR DELETE ON ledger.postings FOR EACH ROW
EXECUTE FUNCTION ledger.check_posting_period_open ();
