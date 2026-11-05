-- A movement belongs to the statement it was imported from, and therefore to the same bank relation
-- and organization.
CREATE OR REPLACE FUNCTION banking.check_movement_statement () RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM banking.statements
    WHERE id = NEW.statement_id
      AND bank_relation_id = NEW.bank_relation_id
      AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Bank statement % does not belong to the bank account and organization of bank movement %',
      NEW.statement_id, NEW.id
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_movement_statement
BEFORE INSERT ON banking.movements FOR EACH ROW
EXECUTE FUNCTION banking.check_movement_statement ();

-- A movement records what the bank booked. Once imported, only its status changes.
CREATE OR REPLACE FUNCTION banking.check_movement_imported_immutable () RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.organization_id, NEW.bank_relation_id, NEW.statement_id, NEW.bank_reference,
      NEW.dedupe_hash, NEW.booked_on, NEW.value_on, NEW.amount, NEW.currency, NEW.counterparty_name,
      NEW.counterparty_address, NEW.counterparty_iban, NEW.creditor_reference, NEW.communication, NEW.description,
      NEW.foreign_amount, NEW.foreign_currency, NEW.bank_fees_amount, NEW.bank_fees_currency)
    IS DISTINCT FROM
     (OLD.organization_id, OLD.bank_relation_id, OLD.statement_id, OLD.bank_reference,
      OLD.dedupe_hash, OLD.booked_on, OLD.value_on, OLD.amount, OLD.currency, OLD.counterparty_name,
      OLD.counterparty_address, OLD.counterparty_iban, OLD.creditor_reference, OLD.communication, OLD.description,
      OLD.foreign_amount, OLD.foreign_currency, OLD.bank_fees_amount, OLD.bank_fees_currency) THEN
    RAISE EXCEPTION 'Bank movement % was imported from a bank statement and only its status can change',
      OLD.id
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_movement_imported_immutable
BEFORE UPDATE ON banking.movements FOR EACH ROW
EXECUTE FUNCTION banking.check_movement_imported_immutable ();
