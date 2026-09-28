# ReBIT FI fixtures (test data only)

One document per FI type, used by `scripts/aa-fi-types-check.ts`:
`deposit.xml` (plus `deposit-prefixed.xml` with `ns2:` prefixes and
`deposit.json`), `term_deposit.xml`, `recurring_deposit.xml`,
`mutual_funds.xml`, `equities.xml`, `sip.xml`.

**Where they come from:** hand-written from the ReBIT FI schemas and their
examples (https://api.rebit.org.in/schema → `FISchema/*.xsd`, checked
28 Sep 2026). Attribute names are the schemas' own. Names are fake
("TEST HOLDER"), account numbers masked, PAN/mobile are ReBIT's placeholders.
**They are not UAT captures yet.**

`deposit.expected.json` is the output of the DEPOSIT parser as it was before
the fast-xml-parser rewrite (the verified live flow). The test checks the new
parser still gives exactly this.

## After the first live multi-type run

Replace each file with ONE redacted sample of what Anumati's UAT bank (ACME)
actually sent for that type:

1. Keep the structure and attribute names exactly as received.
2. Mask every account, demat and folio number to the last 4 digits
   (`XXXXXXXX1234`); replace names, PAN, email, mobile, address with the
   fake values used here; shift nothing else.
3. Re-run `npm run test:engine` and fix any field the parsers missed.

Never commit real customer data or unredacted UAT responses.
