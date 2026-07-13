# Leadway — Lead Management

Web app for capturing sales leads, assigning them to Sales Reps, tracking them
through a 6-stage pipeline, qualifying and scoring them at intake, and logging
WhatsApp outreach. Built for the AI Lead Management Challenge, with an ongoing
Phase 2 (Blueprint §14) adding qualification, analytics, and template management.

**Read first:** [BLUEPRINT.md](BLUEPRINT.md) (what & why) · [CONTEXT.md](CONTEXT.md)
(domain glossary) · [DESIGN.md](DESIGN.md) (visual system) · `docs/adr/`
(architecture decisions 0001–0003) · [docs/user-manual.md](docs/user-manual.md)
(per-role how-to) · [design/mockup.html](design/mockup.html) (clickable design
reference).

**Continuing this project?** Read [HANDOFF.md](HANDOFF.md) first — current state,
open items, environment gotchas, and the verification lap.

**Verified:** 64/64 unit tests pass (five pure `lib/` modules), `tsc --noEmit`
clean, `next build` succeeds (10 routes).

## Prerequisites

- **Node.js 20+** — install from <https://nodejs.org> (the LTS installer adds
  `node` and `npm` to PATH; restart the terminal afterwards).

## Quickstart

```bash
npm install          # installs deps + generates the Prisma client
npm run db:push      # creates prisma/dev.db (SQLite) from the schema
npm run db:seed      # 4 users · 16 leads · 14 WhatsApp templates
npm run dev          # http://localhost:3000
```

`.env` already contains dev defaults (SQLite file DB + a dev-only session
secret). For anything shared or deployed, set a real `SESSION_SECRET`.

### Demo accounts (password for all: `password123`)

| Role | Email | Sees |
|---|---|---|
| Admin | aina@company.my | system-wide; manages users + templates |
| Manager | hafiz@company.my | team-wide; all leads + reports + templates |
| Sales Rep | huiting@company.my | own leads only |
| Sales Rep | farid@company.my | own leads only |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server on port 3000 |
| `npm test` | Vitest — 64 tests across five pure `lib/` modules |
| `npm run db:push` | apply schema changes to the SQLite dev DB |
| `npm run db:seed` | seed demo users, leads, templates, and custom sources |
| `npm run db:reset` | wipe + re-push + re-seed the demo DB |
| `npm run db:studio` | browse the DB in Prisma Studio |
| `npm run build` / `start` | production build / serve |

**Verification lap** — run all three before every commit that touches app code:

```bash
npm test          # must be 64/64
npx tsc --noEmit  # must be clean
npm run build     # must succeed (delete .next first if routes changed)
```

## Routes

Under `app/(app)/` (auth-required shell) unless marked public.

| Route | Access | Purpose |
|---|---|---|
| `/` | public | redirects to login or dashboard |
| `/login` | public | email + password sign-in |
| `/dashboard` | any role | KPIs · pipeline spectrum · velocity strip · needs-attention queue · hottest leads · source breakdown · recent activity |
| `/leads` | any role | list with Status / Source / Rep / Focus filters + fit temperature column |
| `/leads/[id]` | own for Reps, any for Manager/Admin | info · qualification facts · fit score · funnel stepper · lost-reason step · follow-up scheduler · WhatsApp panel · timeline |
| `/reports` | Manager/Admin | per-rep performance · lost reasons · won value by source · pipeline forecast · monthly outcomes |
| `/templates` | Manager/Admin | WhatsApp template CRUD with placeholder validation + per-role availability |
| `/users` | Admin | create · set role · deactivate (no hard delete) |

## How it's put together

- **UI:** Next.js App Router pages under `app/`, styled by the token system in
  `app/globals.css` (spec: [DESIGN.md](DESIGN.md)).
- **Mutations:** Next.js **Server Actions** under `app/(app)/*/actions.ts` — every
  action re-checks auth, permissions, and the transition rule **server-side** and
  writes an Activity row (the audit trail).
- **Business rules:** pure, unit-tested modules in `lib/` — never import
  framework/Prisma types, so they run in Vitest as plain functions:
  - [`transitions.ts`](lib/transitions.ts) — one-step-forward funnel + reopen targets
  - [`permissions.ts`](lib/permissions.ts) — the role matrix (`can(user, action, lead?)`)
  - [`whatsapp.ts`](lib/whatsapp.ts) — phone normalise, wa.me link, template role check
  - [`scoring.ts`](lib/scoring.ts) — fit score (BANT + source + deal), temperature (ADR-0003)
  - [`velocity.ts`](lib/velocity.ts) — time-in-stage, stage conversion, sales cycle from the STATUS_CHANGE audit trail
- **Data:** Prisma + SQLite for dev/demo (offline-resilient, no server needed).
  Production uses Postgres on Neon via a model-identical second schema at
  `prisma/schema.postgres.prisma` that Vercel's build picks up automatically —
  see [docs/deploy.md](docs/deploy.md).

## Feature status

**Blueprint §4 — core (shipped):**

- [x] Login + role-based sessions (no public sign-up)
- [x] Lead list with search + status/source/rep filters (role-scoped)
- [x] Lead create · view · edit · delete (per the permission matrix; delete has an inline confirm)
- [x] Lead assignment to a Sales Rep (Manager/Admin)
- [x] Status tracking — 6-stage funnel, transitions enforced server-side, reopen for Manager/Admin
- [x] Dashboard — role-scoped KPIs, pipeline spectrum, source breakdown, activity feed
- [x] WhatsApp contact — templates, editable preview, wa.me link, activity logged
- [x] Per-lead activity timeline + add-note
- [x] Users admin — create, set role, deactivate/reactivate (no hard delete; self-lockout guarded)

**Blueprint §14 — Phase 2 (shipped):**

- [x] Qualification gate at intake (BANT-style) with live fit score + verdict
- [x] Rule-based fit score & Hot/Warm/Cold temperature (ADR-0003)
- [x] Follow-up scheduling + dashboard needs-attention queue
- [x] Required lost reasons on Mark Lost
- [x] Pipeline velocity — avg days per stage, stage conversion, sales cycle
- [x] Reports screen (Manager/Admin) — per-rep performance, why-we-lose, won by source, monthly trend
- [x] Extensible lead sources — team-added via "+ Add a new source"
- [x] Exact budget amount + expected close date behind the bands; pipeline forecast on Reports
- [x] Editable, role-scoped WhatsApp templates on `/templates` (Manager/Admin)

## Deploy

Vercel + Neon Postgres, fully scripted (`vercel-build` generates the Postgres
client, pushes the schema, and builds). Step-by-step runbook, one-time
production seeding, and demo-day fallback plan: **[docs/deploy.md](docs/deploy.md)**.
