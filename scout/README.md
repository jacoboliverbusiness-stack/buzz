# Scout by Recrua

Autonomous college recruiting agent. An athlete pastes a Hudl profile link; Scout reads the
public profile, matches ~20 college football programs, reads each program's roster and staff
page, verifies coach emails, and drafts a personalized email per program — streamed live.

> Product name is set in `src/lib/brand.ts` (one-line change).

## Run

```bash
npm install
cp .env.example .env.local   # fill what you have; everything is optional
npm run dev
```

`npm test` runs the engine tests. `SCOUT_DEMO_MODE=1 npm run dev` uses clearly-labelled sample
rosters/coaches (for environments that can't reach college athletics sites).

## Current scope (MVP)

Website + onboarding: landing page → paste Hudl link → confirm extracted details (only missing
essentials are asked for) → live research view → campaign preview → account creation.
The full dashboard, editing UI, sending, follow-ups and reply inbox are intentionally not built yet
(the API for edit/regenerate/approve exists).

## How it works

| Stage | Where | Notes |
|---|---|---|
| Profile extraction | `src/lib/profile/` | Reads Hudl's public profile model (allowed by Hudl robots.txt). Private profiles fall back to manual entry. MaxPreps/SportsRecruits/NCSA registered, not live. |
| Program catalogue | `data/programs.football.psv` | ~350 real programs (FBS→NJCAA) with official athletics sites. Coaches are never stored in the seed. |
| Matching | `src/lib/matching/score.ts` | Deterministic and explainable: preferences, distance, academics, roster projection, size vs. current position room. No AI. |
| Roster + staff research | `src/lib/pipeline/research.ts` | Fetches official roster/staff pages (robots.txt-aware, throttled), parses Sidearm/Presto/table layouts, AI fallback only when parsers fail. Cached and shared across athletes (rosters 14 days, coaches 7 days). |
| Email verification | `src/lib/verify/email.ts` | Syntax → published on official page → MX check → optional paid provider. Pattern-inferred addresses stay "unverified". |
| Email drafting | `src/lib/outreach/` | AI writes only from a grounded fact list; a linter rejects invented numbers, hype and "you need me" claims and falls back to a deterministic writer. |
| Gating | `src/lib/present.ts`, `data/plans.json` | Preview shows 3 full drafts and masked emails; limits are config, not code. |

## What's needed to go fully live

1. **Outbound network** to college athletics sites (default on Vercel/most hosts).
2. `ANTHROPIC_API_KEY` for AI-written emails.
3. Supabase project + `supabase/migrations/0001_init.sql`.
4. Stripe products/prices + webhook (`/api/billing/webhook`).
5. Optional: `ZEROBOUNCE_API_KEY` for mailbox-level verification.
6. Legal review of privacy/terms (minors) and NCAA contact-rule guidance before enabling sending.
