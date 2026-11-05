-- Every journal entry must balance: its debits equal its credits.
--
-- Postings can be in different currencies, so each one is first converted to the
-- base currency of the organization and rounded to the cent. This is the same
-- calculation as for the account balances.
--
-- e.g. a debit of 0.000005 ETH at 1 ETH = 3012.45 CHF is worth 1.506225 cents,
-- which counts as 2 cents. It balances with a credit of CHF 0.02.
--
-- When both sides do not match, they differ by whole cents. The user books
-- that difference on a rounding or exchange difference account.
--
-- This must be a DEFERRED constraint trigger, not a plain AFTER INSERT trigger,
-- because postings belonging to one journal entry are inserted as separate rows
-- within the same transaction. A non-deferred trigger would reject the
-- first posting for not balancing alone, before the rest of the entry's
-- lines exist. Deferring the check to COMMIT means it only runs once all
-- lines for the transaction have been inserted.
CREATE OR REPLACE FUNCTION ledger.check_journal_entry_balance () RETURNS TRIGGER AS $$
DECLARE
affected_entry_id uuid;
  balance numeric;
BEGIN
  affected_entry_id := COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);

SELECT COALESCE(SUM(ROUND((p.debit - p.credit) * p.exchange_rate * power(10::numeric, bc.decimals - c.decimals))), 0)
INTO balance
FROM ledger.postings p
         JOIN core.currencies c ON c.code = p.currency
         JOIN ledger.journal_entries je ON je.id = p.journal_entry_id
         JOIN core.accounting_settings s ON s.organization_id = je.organization_id
         JOIN core.currencies bc ON bc.code = s.base_currency
WHERE p.journal_entry_id = affected_entry_id;

IF balance != 0 THEN
    RAISE EXCEPTION 'Journal entry % does not balance: debits minus credits is % cent(s) of the base currency',
      affected_entry_id, balance
      USING ERRCODE = 'R0001';
END IF;

RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER enforce_journal_entry_balance
AFTER INSERT OR UPDATE OR DELETE ON ledger.postings
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION ledger.check_journal_entry_balance ();
