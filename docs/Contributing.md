# Contributing

1. Read [Rules.md](Rules.md) and [API_CONTRACT.md](API_CONTRACT.md) first.
2. Branch: `<name>/<short-topic>` (e.g. `lohit/cash-river`). Small PRs; one feature each.
3. Contract changes: edit API_CONTRACT.md + `web/src/lib/types.ts` + backend in the **same** PR, and log it in [Changelog.md](Changelog.md).
4. Engines: pure functions, integer paise, a test against the golden fixture for any change.
5. Copy: every user string bilingual `{hi, en}`; warm, no shame; rupees not percentages. Amma reviews Hindi.
6. UI: check at 360 px width, tap targets ≥ 48 px, speaker button works.
7. Never commit `.env`, keys, real customer data or unredacted sandbox payloads.
8. Before merging: `pytest -q` (api) and `npm run build` (web) pass.
9. Update [Tracker.md](Tracker.md) when you start / finish an item; add decisions to [Decisions.md](Decisions.md).
