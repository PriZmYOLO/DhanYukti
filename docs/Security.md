# Security & privacy

## Secrets
- Sponsor keys live **only** in backend env (Render/Railway env vars, Supabase vault). Never in the PWA, any `NEXT_PUBLIC_*` variable, Git, docs, screenshots or chat.
- `api/.env` is git-ignored; `api/.env.example` lists names with empty values.
- Before demo: `grep -r "PERFIOS\|ANUMATI" web/.next` must return nothing.
- Browser calls only `/api/*` on our own origin; Next proxies to FastAPI.

## Data handling
- **Retention:** Decrypted bank data is deleted 24 hours after it arrives. Only a few derived facts are kept, until you revoke or for at most 30 days. (Live AA: `aa:data` 24 h, `aa:summary` 30 days, both deleted on revoke; a payload that couldn't be decrypted is kept as ciphertext for 24 h under `aa:raw` to re-open with Anumati's jar. After 24 h, readers answer "expired", never "not seen" or 0.)
- **Minimisation:** FI types DEPOSIT, RD, INSURANCE only; 6 months; monthly fetch. Each non-financial field is tied to one decision and asked only when it changes an answer.
- **Revoke:** DhanYukti stops using the data now and deletes its copy (bank data and derived facts), refuses late results and invalidates open action cards. The FIU module has no revoke call, so the consent itself is closed in the Anumati app; the screen says so and links to it. No household vote.
- **Delete everything** (`POST /api/me/delete`, this browser session only): revokes every bank link, withdraws every granted DPDP purpose (each purpose's data deletion runs) and deletes reports. Value Ledger receipts stay: they hold no financial data and prove the withdrawals.
- **Admin reset** (`POST /api/admin/reset`, FastAPI) resets demo state for everyone, so it needs `X-Admin-Token` = `ADMIN_RESET_TOKEN` (403 if unset or wrong). The browser never calls it; the team uses `web/scripts/reset-demo.sh`.
- **Privacy inside the family:** per-member sharing levels; private members' points are private too; kids' view shows the jar only.
- **Assisted mode:** helper sees step status only.
- Never infer health, caste, religion or worth.

## Logging
Request IDs and HTTP status codes only. Never payloads, OTPs, account numbers, keys. Track sandbox credit usage.

## Crypto
Never hand-rolled. Decrypt FI payloads only with the provider's documented library and test vectors (`decrypt_fi_payload()` hook).

## Action safety
- **High Stakes Gate:** reads back amount + date + destination before any action; user confirms.
- **Recommendation Firewall:** ranking never sees commission; inline disclosure "DhanYukti ko ₹X milega"; quarterly incentive ledger.
- Loan referrals only to lenders on RBI's DLA directory.

## Regulatory map
RBI AA Master Direction (run as FIU under a regulated partner) · ReBIT AA client standards · DPDP Act 2023 + Rules 2025 (consent-manager phase from 13 Nov 2026) · RBI Digital Lending Directions 2025 · SEBI IA Regulations · IRDAI distribution rules. We do not claim certification.
