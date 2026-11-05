# Test fixtures

## `ubs-camt-053.xml`

A camt.053.001.08 sample published by UBS, wrapped in a SWIFT envelope (`urn:swift:xsd:envelope`) with a business application header. It holds one CHF statement of 15 booked movements with dummy names and test IBANs.

Downloaded as is from the "UBS camt.053 sample" link at the end of https://www.ubs.com/ch/en/bank-for-banks/offering/cash/iso20022.html.

## `qr-camt-053.xml`

A hand-written camt.053.001.08 for the account `CH3908704016075473007`, which receives QR-bill payments, from 1 to 14 October 2026, with an opening balance of CHF 10,000.00 and a closing balance of CHF 10,930.50. It holds:

- a QR-bill payment of CHF 1,055.50 with the QR reference `000000532139565642554536114`;
- an incoming transfer of CHF 200.00 without a reference;
- a payment of CHF 320.00 to a supplier;
- a bank fee of CHF 5.00 described only by `AddtlNtryInf`;
- a pending (`PDNG`) entry of CHF 75.00, which is not booked and therefore not counted in the balances.

## `qr-camt-053-v04.xml`

The same statement as `qr-camt-053.xml`, written in camt.053.001.04, the older version many Swiss banks still send. It only differs where the two versions do: the entry status is given directly (`<Sts>BOOK</Sts>` instead of `<Sts><Cd>BOOK</Cd></Sts>`) and the name of a party is not wrapped in a `<Pty>`.
