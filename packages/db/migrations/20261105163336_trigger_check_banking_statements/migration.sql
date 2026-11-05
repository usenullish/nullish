-- A statement belongs to the organization of its bank relation.
CREATE OR REPLACE FUNCTION banking.check_statement_bank_relation () RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM core.bank_relations
    WHERE id = NEW.bank_relation_id
      AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Bank account % does not belong to the organization of bank statement %',
      NEW.bank_relation_id, NEW.id
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_statement_bank_relation
BEFORE INSERT ON banking.statements FOR EACH ROW
EXECUTE FUNCTION banking.check_statement_bank_relation ();

-- A statement records what was imported, never something to edit afterward.
CREATE OR REPLACE FUNCTION banking.check_statements_immutable () RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Row % cannot be modified once created', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_statements_immutable
BEFORE UPDATE ON banking.statements FOR EACH ROW
EXECUTE FUNCTION banking.check_statements_immutable ();
