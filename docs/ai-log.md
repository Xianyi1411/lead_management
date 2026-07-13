# AI usage log

Key AI prompts and outcomes across the lifecycle (Blueprint §1 — "AI Prompt
Engineering" evidence). Newest last. Each entry: what was asked, what the AI did,
and what a human decided/verified.

## 1 · Design phase — blueprint, glossary, ADRs

- **Prompt pattern:** iterative "grilling" sessions to pin down scope, roles, the
  transition rule, and the WhatsApp intent-vs-delivery distinction.
- **Outcome:** BLUEPRINT.md (single source of truth), CONTEXT.md (ubiquitous
  language with *avoid* lists), ADR-0001 (Next.js full-stack on Vercel/Postgres),
  ADR-0002 (WhatsApp click-to-chat logs intent, not delivery).
- **Human decision:** cut in-app AI features (paid API key not available); AI is
  demonstrated through the process instead.

## 2 · UI/UX direction

- **Prompt:** "read the blueprint … make sure how our design UI will look like using
  impeccable and frontend-design skills", then "give me the plan for this project for
  frontend UIUX".
- **Outcome:** a design thesis ("the identity is the pipeline, not a logo") — a fixed
  six-colour status spectrum used as data-encoding across funnel bar, status pills,
  stepper, and logo mark; cool light theme justified by the field-rep use case;
  Inter + IBM Plex Mono (tabular figures for RM values); an explicit anti-pattern
  list (no cream background, no gradient hero-metric cards, WhatsApp green
  quarantined to the action). Captured in DESIGN.md.
- **Human decision:** approved the plan; asked for a visual mockup before committing.

## 3 · Visual mockup + motion

- **Prompt:** "build visual mockup", then "confirm … smooth UI transition and effect
  flow when interact, make sure it is modern enough" → chose **Refined & smooth**.
- **Outcome:** `design/mockup.html` — four screens (login, dashboard, leads, lead
  detail) with a working status-advance demo: pill colour-flush, stepper fill, live
  timeline entries, KPI count-up, funnel wipe-in, staggered reveals; reduced-motion
  respected. The AI drove the mockup in a browser to verify (found and fixed a
  count-up bug under rAF throttling by adding a guaranteed-final-value fallback).
- **Human decision:** locked the direction; start scaffolding.

## 4 · Scaffold — data + business core + app slice

- **Prompt:** "direct locked and start scaffolding", then "continue, and see whether
  the previous one need to enhance".
- **Outcome:** full Next.js 14 + Prisma + Vitest scaffold: schema + seed; pure
  `lib/transitions.ts`, `lib/permissions.ts`, `lib/whatsapp.ts` with test suites;
  cookie-session auth (bcrypt + jose) with an edge-safe middleware guard; dashboard,
  leads list (search + filters), lead detail (stepper enforcing legal moves only,
  WhatsApp panel, timeline, assign, delete), create-lead form; Users admin list.
- **Enhancement pass caught:** `Decimal` isn't supported by Prisma's SQLite
  connector — `dealValue` switched to `Int` (whole RM) with a note to restore
  Decimal on Postgres. Mutations use Server Actions (equivalent of the Blueprint's
  API routes), each re-checking auth + permission + transition server-side.
- **Constraint:** Node.js not installed on the build machine — `npm install`,
  `db:push/seed`, tests, and `dev` are run by the human after installing Node LTS.

## 5 · Feedback-driven UI iteration (against the running app)

- **Prompts:** human ran the app and gave concrete visual feedback in plain language:
  the logo bars "look weird", the mockup's motion "disappeared" in the app, lead
  detail should be a four-panel grid, log out too small and misplaced, filter
  controls indistinguishable ("need difference between these components … show the
  different level of each"), logo mismatch between login and rail, table columns vs
  rows need colour separation.
- **Outcomes:** logo redesigned to five ascending bars (funnel happy path) with one
  horizontal lockup everywhere; motion layer ported into React (CountUp component,
  CSS entrance choreography, funnel wipe, pill flush, timeline slide-in — all
  reduced-motion-safe); lead detail rebuilt as a 2×2 equal-panel grid with in-panel
  scrolling; labelled Log out button at the topbar's far right; a four-level filter
  hierarchy (solid iris → soft iris → bordered inputs with chevrons + active state →
  plain text); table header band + zebra rows. Each decision written back into
  DESIGN.md so the spec tracks the product.

## 6 · Completing the feature matrix

- **Prompt:** "continue".
- **Outcome:** lead edit form (permission-gated, no fake audit entries — edits change
  facts, not history), add-note on the timeline (new `add_note` permission + test),
  and full Users admin: create user (hashed password, unique-email check), per-row
  role change, deactivate/reactivate with self-lockout guards (an Admin can't
  deactivate or demote themselves). README feature checklist fully green.

## 7 · Verification + user manual

- **Context:** once Node.js was installed on the machine, the AI located the install
  (`C:\Program Files\nodejs`, absent from its shell's stale PATH) and ran the whole
  verification stack itself: **28/28 Vitest tests pass**, `tsc --noEmit` **clean**,
  `next build` **succeeds** (9 routes, ~87–97 kB first-load JS).
- **Outcome:** `docs/user-manual.md` — per-role walkthroughs (Sales Rep / Manager /
  Admin), written strictly in the CONTEXT.md vocabulary, with demo accounts and a
  "quick answers" section that pre-empts the demo-day questions (why no Won button,
  why a Rep can't see a Lead, what WhatsApp logging does and doesn't prove).

## 8 · Deploy prep, deployment, and live fixes (Vercel + Neon)

- **Prompt:** "do the deploy prep", then live troubleshooting during the real deploy.
- **Outcome:** dual-schema strategy — `schema.prisma` (SQLite) stays the offline demo
  fallback while a model-identical `schema.postgres.prisma` targets Neon; a
  `vercel-build` script generates the Postgres client, pushes the schema, and builds;
  `postinstall` gained a fallback so Vercel's install step doesn't trip on the dev
  schema; `db:prod:seed` for one-time production seeding. `docs/deploy.md` runbook
  covers Neon setup (direct vs pooled URL gotcha), Vercel env vars, seeding with a
  wipe warning, demo-day fallback, and troubleshooting. Git repo initialized and
  pushed to GitHub. Post-deploy feedback ("clicking feels slow") was diagnosed as a
  region mismatch — functions in US East, database in Singapore — fixed by pinning
  Vercel to sin1; "edit lead didn't follow the pop-out frame" became the edit dialog;
  a custom dropdown replaced every native select so open menus match the design
  system; Next.js patched to 14.2.35.

## 9 · Presentation deck

- **Prompt:** "draft the presentation… clean… for non-coding people and leaders/CEO…
  tell them how I implemented Claude Code, the important prompts and method, from
  business-logic confirmation until frontend demo until the output."
- **Outcome:** `presentation/Leadway-presentation.pptx` — 13 slides in the Leadway
  design tokens (ink/fog/iris + the pipeline spectrum as the recurring motif), zero
  code on slides. The spine is the five-move method (agree the language → see the
  design first → lock rules into tests → steer in plain words → verify then ship),
  each move carrying its real verbatim prompt as a styled quote card. Includes a
  six-beat demo slide and full speaker notes with timings, demo script, and Q&A prep.
  Generated with pptxgenjs (no Python on the machine), structurally QA'd by
  unpacking the OOXML.

## 10 · Phase 2 — qualification gate, scoring, follow-ups, velocity, reports

- **Prompt:** "suggest 3–5 new functions… connect with this system's usage and our
  user group… professional perspective and more analytics" → then "implement all
  this", plus the user's own concept: "gather more info from the leads itself, we
  can qualify and segment the leads, then provide the scoring… to prevent any
  resources waste… i have an idea on training a prediction model but i not sure
  on where can we gather for the data?"
- **Outcome:** six features in one pass, all inside the existing conventions.
  (1) A BANT-style **qualification gate** in the Add/Edit dialogs — three intake
  questions scored live (0–100 fit score + Strong/Medium/Low-fit verdict with
  plain-language guidance) so weak leads can be parked before costing rep time —
  the user's segmentation concept realised. (2) `lib/scoring.ts` +
  `lib/velocity.ts` as pure, unit-tested rule modules (25 new Vitest tests;
  53 total). (3) Follow-up scheduling with an Overdue/Due-today/Idle
  **Needs-attention queue** and a Focus filter. (4) Required **lost reasons** on
  Mark Lost. (5) A dashboard **Velocity strip** (avg days per stage, stage→stage
  conversion, sales cycle) reconstructed purely from the STATUS_CHANGE audit
  trail — the audit log doubling as the analytics source. (6) A Manager/Admin
  **Reports** screen: rep performance with first-response time, why-we-lose,
  won-value-by-source, monthly outcomes. The prediction-model question became
  **ADR-0003**: labels must come from the system's own win/loss history (external
  data can only be features), ~200+ closed leads are needed before a model beats
  a rule — so ship an explainable rule now and capture structured qualification
  facts + lost reasons from day one as the future training set, with
  `qualificationScore()` as the swap point. AI note: the session started on a
  fresh clone (no node_modules/.env/dev.db) — the environment was rebuilt from
  the handoff doc before any code was written, and every feature was verified
  live in the browser (login → dashboard → gate → lost-reason step → reports)
  before commit; two logic refinements came from that walkthrough (a lead with a
  scheduled future follow-up is not "idle"; due-today is not "overdue").

## 11 · Extensible sources + a stale-session hardening

- **Prompt:** "for the source, i think need to let user to add new, becuz there
  might not only have these criteria only."
- **Outcome:** sources became an open list without giving up grouped analytics:
  a "+ Add a new source" flow in the Add/Edit dialogs registers names in a new
  `CustomSource` table (server-deduped case-insensitively against built-ins and
  existing customs — "web site" resolves to Website instead of forking the
  data), and the source filter, dashboard breakdown, won-value-by-source report,
  and fit rule (neutral 5/10 until proven) all handle built-in codes and custom
  names uniformly through one `sourceLabel()` helper. AI note: mid-verification,
  reseeding the database under a live login exposed a latent crash — App Router
  renders layout and page in parallel, so the layout's auth redirect doesn't
  protect a page that assumes a non-null user. Every page's `getCurrentUser()!`
  assertion was replaced with a `requireUser()` guard that redirects to /login;
  confirmed over HTTP that a stale session now lands on the login page instead
  of a 500.
