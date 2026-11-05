-- Enforces the legal invoice status transitions:
-- draft -> open -> paid/uncollectible/void, paid <-> open
-- (reopening after unapplying a payment), uncollectible <-> paid/void.
-- Void is terminal, no further changes once reached. Any other jump
-- (e.g. draft -> paid) or any update at all once void is rejected.
--
-- Stripe flow: https://support.stripe.com/questions/invoice-states?locale=en-US
CREATE OR REPLACE FUNCTION billing.check_invoice_status_transition () RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'void' THEN
    RAISE EXCEPTION 'Invoice % is void and cannot be modified', OLD.id;
END IF;

  IF NOT (
    (OLD.status = 'draft' AND NEW.status = 'open') OR
    (OLD.status = 'open' AND NEW.status IN ('paid', 'uncollectible', 'void')) OR
    (OLD.status = 'paid' AND NEW.status = 'open') OR
    (OLD.status = 'uncollectible' AND NEW.status IN ('paid', 'void')) OR
    (OLD.status = NEW.status)
  ) THEN
    RAISE EXCEPTION 'Invalid invoice status transition: % -> %', OLD.status, NEW.status;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_invoice_status_transition
BEFORE UPDATE ON billing.invoices FOR EACH ROW
EXECUTE FUNCTION billing.check_invoice_status_transition ();
