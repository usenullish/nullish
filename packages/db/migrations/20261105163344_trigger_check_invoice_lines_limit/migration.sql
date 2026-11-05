-- An invoice has at most 1_000 lines. Gapped to prevent abuse.
CREATE OR REPLACE FUNCTION billing.check_invoice_lines_limit () RETURNS TRIGGER AS $$
DECLARE
  inserted_invoice_id UUID;
BEGIN
  FOR inserted_invoice_id IN SELECT DISTINCT invoice_id FROM inserted_lines ORDER BY invoice_id LOOP
    -- Inserts on the same invoice wait for each other until the transaction ends,
    -- so that the count includes the lines another transaction has just added.
    PERFORM pg_advisory_xact_lock(hashtextextended('billing.lines.invoice:' || inserted_invoice_id::text, 0));

    IF (SELECT COUNT(*) FROM billing.lines WHERE invoice_id = inserted_invoice_id) > 1000 THEN
      RAISE EXCEPTION 'Invoice % cannot have more than 1000 lines', inserted_invoice_id
        USING ERRCODE = 'R0001';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_invoice_lines_limit
AFTER INSERT ON billing.lines REFERENCING NEW TABLE AS inserted_lines FOR EACH STATEMENT
EXECUTE FUNCTION billing.check_invoice_lines_limit ();
