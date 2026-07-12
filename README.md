# Leadway — Lead Management

Web app for capturing sales leads, assigning them to Sales Reps, tracking them through
a 6-stage pipeline, and logging WhatsApp outreach. Built for the AI Lead Management
Challenge.

**Read first:** [BLUEPRINT.md](BLUEPRINT.md) (what & why) · [CONTEXT.md](CONTEXT.md)
(domain glossary) · [DESIGN.md](DESIGN.md) (visual system) · `docs/adr/` (architecture
decisions) · [docs/user-manual.md](docs/user-manual.md) (per-role how-to) ·
[design/mockup.html](design/mockup.html) (clickable design reference).

**Verified:** 28/28 unit tests pass, `tsc --noEmit` clean, `next build` succeeds
(all 9 routes, ~87–97 kB first-load JS).

## Prerequisites

- **Node.js 20+** — install from <https://nodejs.org> (the LTS installer adds `node`
  and `npm` to PATH; restart the terminal afterwards).

## Quickstart

```bash
npm install          # installs deps + generates the Prisma client
npm run db:push      # creates prisma/dev.db (SQLite) from the schema
npm run db:seed      # demo users, ~12 leads, activity timelines
npm run dev          # http://localhost:3000
```

`.env` already contains dev defaults (SQLite file DB + a dev-only session secret).
For anything shared or deployed, set a real `SESSION_SECRET`.

### Demo accounts (password for all: `password123`)

| Role | Email |
|---|---|
| Admin | aina@company.my |
| Manager | hafiz@company.my |
| Sales Rep | huiting@company.my |
| Sales Rep | farid@company.my |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server |
| `npm test` | Vitest — the three pure business-logic modules |
| `npm run db:reset` | wipe + re-push + re-seed the demo DB |
| `npm run db:studio` | browse the DB in Prisma Studio |
| `npm run build` / `start` | production build / serve |

## How it's put together

- **UI:** Next.js App Router pages under `app/`, styled by the token system in
  `app/globals.css` (spec: [DESIGN.md](DESIGN.md)).
- **Mutations:** Next.js **Server Actions** in `app/(app)/leads/actions.ts` and
  `app/login/actions.ts` — the modern equivalent of the Blueprint's API route
  handlers. Every action re-checks auth, permissions, and the transition rule
  **server-side** and writes an Activity row (the audit trail).
- **Business rules:** pure, unit-tested modules in `lib/` —
  [`transitions.ts`](lib/transitions.ts) (the one-step-forward funnel),
  [`permissions.ts`](lib/permissions.ts) (the role matrix),
  [`whatsapp.ts`](lib/whatsapp.ts) (wa.me link + templates). Tests in `tests/`.
- **Data:** Prisma + SQLite for dev/demo (offline-resilient). Production uses
  Postgres on Neon via a second, model-identical schema
  (`prisma/schema.postgres.prisma`) that Vercel's build picks up automatically —
  see [docs/deploy.md](docs/deploy.md).

## Deploy

Vercel + Neon Postgres, fully scripted (`vercel-build` generates the Postgres
client, pushes the schema, and builds). Step-by-step runbook, one-time production
seeding, and demo-day fallback plan: **[docs/deploy.md](docs/deploy.md)**.

## Feature status (Blueprint §4)

- [x] Login + role-based sessions (no public sign-up)
- [x] Lead list with search + status/source/rep filters (role-scoped)
- [x] Lead create · view · **edit** · **delete** (per the permission matrix; delete has an inline confirm)
- [x] Lead assignment to a Sales Rep (Manager/Admin)
- [x] Status tracking — 6-stage funnel, transitions enforced server-side, reopen for Manager/Admin
- [x] Dashboard — role-scoped KPIs, pipeline spectrum, source breakdown, activity feed
- [x] WhatsApp contact — templates, editable preview, wa.me link, activity logged
- [x] Per-lead activity timeline + add-note
- [x] Users admin — create, set role, deactivate/reactivate (no hard delete; self-lockout guarded)
