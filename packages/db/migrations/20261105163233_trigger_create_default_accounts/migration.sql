-- When a new organization is created, seed its accounts from the
-- ledger_accounts template rows matching its legal_form. First insert
-- every account with no parent, then update parent_id by matching each
-- template's parent back to the code of the account just created for it.
-- Finally, create the system references on the newly created account which is
-- useful for automate tasks by the app.
CREATE OR REPLACE FUNCTION core.seed_default_accounts_for_organization () RETURNS TRIGGER AS $$
BEGIN
-- Create the accounts
INSERT INTO ledger.accounts (organization_id, code, type)
SELECT NEW.id, t.code, t.type
FROM templates.ledger_accounts t
WHERE t.legal_form = NEW.legal_form;

-- Map the accounts parents ID (2000 -> 2000 -> 20 -> 2)
UPDATE ledger.accounts a
SET parent_id = pa.id
    FROM templates.ledger_accounts t
  JOIN templates.ledger_accounts pt ON pt.id = t.parent_id
    JOIN ledger.accounts pa ON pa.organization_id = NEW.id AND pa.code = pt.code
WHERE a.organization_id = NEW.id
  AND a.code = t.code
  AND t.legal_form = NEW.legal_form;

-- Create the system accounts references
INSERT INTO ledger.system_accounts (organization_id, account_id, purpose)
SELECT NEW.id, a.id, t.purpose
FROM templates.ledger_accounts t
         JOIN ledger.accounts a ON a.organization_id = NEW.id AND a.code = t.code
WHERE t.legal_form = NEW.legal_form
  AND t.purpose IS NOT NULL;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seed_default_accounts_on_organization_created
AFTER INSERT ON core.organizations FOR EACH ROW
EXECUTE FUNCTION core.seed_default_accounts_for_organization ();
