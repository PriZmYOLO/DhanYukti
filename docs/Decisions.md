# Decision log

| # | Date | Decision | Why | Alternatives |
|---|---|---|---|---|
| D1 | 26 Sep | PWA (Next.js 16), not native | Installs on cheap Android, one codebase, fastest to demo | Capacitor APK later |
| D2 | 26 Sep | Family pays ₹0; sponsor bank/NBFC/employer pays ₹50–70 | ₹89/mo is ₹1,068/yr for a ₹30k family; FIU must be regulated anyway | Family subscription |
| D3 | 26 Sep | Rules-based detection in v1, no ML | Explainable, testable against golden fixtures | ML categoriser |
| D4 | 26 Sep | Rules calculate, AI explains | Trust + regulatory safety | LLM-driven advice |
| D5 | 26 Sep | Hand-built SVG charts, no chart library | Bundle < 1.5 MB, custom drag interactions | Recharts |
| D6 | 26 Sep | Romanised Hinglish as primary copy, English secondary, Devanagari tab labels | Matches how users read WhatsApp; TTS friendly | Pure Devanagari |
| D7 | 26 Sep | Browser calls `/api` via Next rewrite | Keys never near the client; no CORS | Direct calls |
| D8 | 26 Sep | Replay connectors behind same interface | Demo survives sandbox/network failure; disclosed to judges | Mock UI only |
| D9 | 26 Sep | Safety floor ₹4,000 for household A | Makes the honest residual (₹2,500 below floor after moving the fee) visible | No floor |
| D10 | 26 Sep | "Haldi & Neel" palette | Indian, warm, high contrast; maps to status colours | Purple fintech |
| D11 | 26 Sep | In-memory store for prototype | Speed; Supabase schema documented in Schema.md | Supabase day 1 |
