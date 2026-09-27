# Security & privacy

## Secrets
- Sponsor keys live **only** in backend env (Render/Railway env vars, Supabase vault). Never in the PWA, any `NEXT_PUBLIC_*` variable, Git, docs, screenshots or chat.
- `api/.env` is git-ignored; `api/.env.example` lists names with empty values.
- Before demo: `grep -r "PERFIOS\|ANUMATI" web/.next` must return nothing.
- Browser calls only `/api/*` on our own origin; Next proxies to FastAPI.

## Data handling
- **Compute-then-delete:** raw AA/Perfios payloads deleted within 24 h; only ~20 derived features kept.
- **Minimisation:** FI types DEPOSIT, RD, INSURANCE only; 6 months; monthly fetch. Each non-financial field is tied to one decision and asked only when it changes an answer.
- **Revoke:** cancels future fetches at Anumati, deletes derived profile, invalidates open action cards. No household vote.
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
