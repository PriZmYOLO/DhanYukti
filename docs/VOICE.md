# Hindi voice read-out (Bhashini, Job 2c)

The Home nudge "On 28 Sept, cash would be short by ₹3,000" can be heard in
Hindi. English text → Bhashini translation → Bhashini Hindi speech.

## Privacy by construction

- The browser sends only `{ nudge: "cash_short", params: { amount_paise, date } }`.
  The server builds the sentence from a fixed template
  (`lib/voice/nudges.ts`), so a name, account number or free text **cannot**
  reach Bhashini: there is no field for it. Inputs are validated (whole
  rupees, ISO date).
- DPDP consent "Voice read-outs" is asked on first tap (receipt in the Value
  Ledger; withdraw in the Consent Passport). The server refuses without it.
- Nothing is stored or logged: not the text, not the audio.
- **Numbers are never left to a model.** If Bhashini's translation changes or
  drops any number (Devanagari digits are recognised), the reviewed Hindi
  template is spoken instead, and the screen says so.
- The screen shows what was sent ("What was sent") and whether audio is
  live or recorded.

## Set up (about 10 minutes)

1. Register at https://bhashini.gov.in/ulca/user/register, verify your email,
   log in.
2. **My Profile → Generate** (app name in lowercase/underscores, e.g.
   `dhanyukti`). Copy your **User ID** and **API key**.
3. Vercel → Settings → Environment Variables (Production):
   - `BHASHINI_USER_ID` = your User ID
   - `BHASHINI_ULCA_API_KEY` = your API key
   - `NEXT_PUBLIC_VOICE` = `true` (shows the "Listen in Hindi" button)
4. Redeploy. On Home, tap **हिंदी में सुनें · Listen in Hindi**.

Optional: `BHASHINI_INFERENCE_KEY` (if the config call doesn't return one),
`BHASHINI_PIPELINE_ID` (default `64392f96daac500b55c543cd`).

## Fallback clip (record once the key works)

From `web/`, on a laptop with the key:

```bash
BHASHINI_USER_ID=… BHASHINI_ULCA_API_KEY=… npm run voice:record -- --amount 3000 --date 2026-09-28
git add public/voice lib/voice/recorded.json && git commit -m "Recorded Bhashini fallback clip"
```

The app plays it only when live Bhashini is unavailable, only for exactly
the same nudge and values, and labels it "Recorded earlier through Bhashini
on <date>". The script refuses to record from the local mock.

## Develop without a key

```bash
node scripts/mock-bhashini.mjs     # LOCAL MOCK, not Bhashini; MOCK_DROP_NUMBERS=1 to test the number guard
BHASHINI_CONFIG_URL=http://localhost:4020/config BHASHINI_USER_ID=mock-user \
BHASHINI_ULCA_API_KEY=mock-key NEXT_PUBLIC_VOICE=true npm run dev
```

Checks: `npm run test:engine` includes `scripts/voice-fixtures.ts`
(templates, number guard, input validation).

## Files

`lib/voice/nudges.ts` (templates, guard) · `lib/server/voice/bhashini.ts`
(config + compute) · `app/api/voice/nudge/route.ts` ·
`components/voice/listen-hindi.tsx` · `lib/voice/recorded.json` +
`public/voice/` (fallback) · `scripts/bhashini-record.ts` ·
`scripts/mock-bhashini.mjs`
