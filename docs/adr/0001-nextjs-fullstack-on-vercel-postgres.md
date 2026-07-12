# Next.js full-stack monolith on Vercel with Postgres

Built for the AI Lead Management Challenge with a 4-day deadline and a live 15-minute demo. We chose a single Next.js codebase (React UI + API route handlers + Prisma ORM) deployed on Vercel with a Neon Postgres database, over a split React + Express architecture or a PHP/Python stack. One codebase means one deploy, shared types between UI and API, and the fastest AI-assisted iteration loop; Vercel + Neon gives judges a public URL with near-zero ops work.

## Considered Options

- **React + Node/Express split** — clearer client/server diagram for the System Design deliverable, but double the wiring (CORS, two servers, duplicated types) in a 4-day window.
- **Laravel / Django** — solid CRUD frameworks, but slower AI-scaffolding ecosystem and no advantage for this team.
- **Local-only demo with SQLite** — zero network risk, but a deployed URL demos and scores better; local dev remains the Wi-Fi-failure fallback.

## Consequences

- Local dev environment doubles as the demo backup; keep seed data resettable.
- Prisma schema is the single source of truth for the ERD deliverable.
