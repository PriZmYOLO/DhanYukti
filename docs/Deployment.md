# Deployment

| Piece | Where | Notes |
|---|---|---|
| Web (PWA) | Vercel | Env: `API_ORIGIN=https://<api-host>` (server-only) |
| API | Render or Railway | Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`; sponsor secrets as env vars |
| DB (post-prototype) | Supabase, India region | RLS on |

## Checklist before demo (Tue 29 Sep, Harshal)
- [ ] API deployed on HTTPS; `ANUMATI_CALLBACK_URL` points to it
- [ ] `/api/health` shows expected live/replay modes
- [ ] No secret in the client bundle (`grep` the build output)
- [ ] Redacted replay fixture recorded from a real sandbox fetch
- [ ] Backup environment (second deploy) + local run on the demo laptop
- [ ] PWA installed on the ₹10k Android demo phone; mirroring tested
- [ ] 90-second screen recording as last-resort fallback
- [ ] Sandbox credits checked

## Demo-day fallbacks
| Risk | Fallback |
|---|---|
| Sandbox / network down | Recorded redacted replay, said aloud |
| AA access not confirmed by Mon | BSA statement route with approved non-lending config |
| Voice fails | Text mode, same numbers |
| Mirroring fails | Pre-recorded video |
