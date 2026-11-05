-- An invoice gets its payment reference when it leaves draft: 20 random digits, from which the
-- reference of the QR-bill is built so that a payment can be matched to its invoice. Random rather
-- than a sequence, so that it reveals nothing about the invoices of the organization. It is unique
-- within the organization and cannot be set or changed otherwise.
--
--┌───────────────────────┬───────────────────────────────────────────────────────────────┬────────────┬───────────────────────────────────┐
--│         Case          │                            Format                             │    Room    │             20 digits             │
--├───────────────────────┼───────────────────────────────────────────────────────────────┼────────────┼───────────────────────────────────┤
--│ Regular IBAN          │ creditor reference: RF + 2 check digits + up to 21 characters │ 21         │ fits, 1 to spare                  │
--├───────────────────────┼───────────────────────────────────────────────────────────────┼────────────┼───────────────────────────────────┤
--│ QR-IBAN without QR-ID │ QR reference: 26 digits + 1 check digit                       │ 26         │ fits, padded with 6 zeros         │
--├───────────────────────┼───────────────────────────────────────────────────────────────┼────────────┼───────────────────────────────────┤
--│ QR-IBAN with QR-ID    │ QR-ID + our digits in the same 26 digits + 1 check digit      │ 26 − QR-ID │ fits exactly with a 6-digit QR-ID │
--└───────────────────────┴───────────────────────────────────────────────────────────────┴────────────┴───────────────────────────────────┘
--
CREATE OR REPLACE FUNCTION billing.assign_invoice_payment_reference () RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'draft' AND NEW.status != 'draft' THEN
    NEW.payment_reference := lpad(random(0, 9999999999)::text, 10, '0') || lpad(random(0, 9999999999)::text, 10, '0');

    RETURN NEW;
END IF;

  IF NEW.payment_reference IS DISTINCT FROM OLD.payment_reference THEN
    RAISE EXCEPTION 'payment_reference cannot be changed (row %)', OLD.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assign_invoice_payment_reference
BEFORE UPDATE ON billing.invoices FOR EACH ROW
EXECUTE FUNCTION billing.assign_invoice_payment_reference ();
