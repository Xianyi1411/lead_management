# HANDOFF — session state for the next conversation

> Purpose: this file lets a brand-new AI conversation (or a human) pick up exactly
> where the previous session ended, with zero lost context. Read this first, then
> the docs it points to. **Written 2026-07-13** after the Phase 2 build.

---

## 1 · What this project is

**Leadway** — a lead-management web app for the *AI Lead Management Challenge*.
The core (Blueprint §4) was scored and demoed; **Phase 2 (Blueprint §14)** has
since added qualification, scoring, follow-ups, velocity analytics, a
Manager/Admin Reports screen, extensible sources, and editable role-scoped
WhatsApp templates. One person + Claude Code built the whole thing.

**Source-of-truth documents (read in this order):**

| File | What it holds |
|---|---|
| [BLUEPRINT.md](BLUEPRINT.md) | The full build spec — features (§4 core + §14 Phase 2), roles, ERD, rules |
| [CONTEXT.md](CONTEXT.md) | Domain glossary (the agreed vocabulary — use these words) |
| [DESIGN.md](DESIGN.md) | Visual system: tokens, components, motion, layout decisions |
| `docs/adr/` | ADR-0001 (Next.js/Vercel/Postgres), ADR-0002 (WhatsApp logs intent), ADR-0003 (rule-based scoring, model-ready capture) |
| [docs/deploy.md](docs/deploy.md) | Vercel + Neon runbook |
| [docs/user-manual.md](docs/user-manual.md) | Per-role how-to (covers Phase 2 features) |
| [docs/ai-log.md](docs/ai-log.md) | The AI-usage story — 12 entries, judged material |
| `design/mockup.html` | Original approved clickable design mockup (historical reference) |
| `presentation/XeersLead-presentation.pptx` | The main 13-slide deck |
| `presentation/XeersLead-architecture-slides.pptx` | Three companion slides (ERD, plain-language architecture, project structure) |

## 2 · Current state — what has shipped

**Core (Blueprint §4)** — login/roles/sessions, lead CRUD (create + edit as
centered dialogs, delete with inline confirm), assignment, 6-stage funnel with
server-enforced transitions + Manager/Admin reopen, role-scoped dashboard,
search + instant filters, WhatsApp click-to-chat (ADR-0002) with logged intent,
per-lead timeline + notes, Users admin.

**Phase 2 (Blueprint §14) — every item shipped:**

1. **Qualification gate** at intake (BANT-style budget/authority/timeline
   dropdowns) with live 0–100 fit score, verdict (Strong/Medium/Low), and
   plain-language guidance — advises, never blocks.
2. **Scoring engine** (`lib/scoring.ts`, pure + tested): fit score from
   qualification + source + deal band; Hot/Warm/Cold **temperature** from fit +
   funnel depth − inactivity − overdue-follow-up. Explainable rule now,
   model-ready capture per ADR-0003.
3. **Follow-up scheduling** on the lead detail page; dashboard **needs-attention
   queue** (overdue / due today / idle) + `Focus` filter on the leads table.
4. **Lost reasons** — Mark Lost requires a structured reason (six-value list);
   reopening clears it.
5. **Velocity analytics** (`lib/velocity.ts`, pure + tested) reconstructed from
   STATUS_CHANGE activities: avg days per stage, stage→stage conversion, sales
   cycle. Dashboard **Velocity strip**.
6. **Reports screen** (Manager/Admin, `view_reports` permission): per-rep table
   with first-response time, why-we-lose, won value by source, **Pipeline
   forecast** (from expected close dates), monthly Won/Lost outcomes.
7. **Extensible sources** — `CustomSource` table + "+ Add a new source" flow in
   the Add/Edit dialogs; server-deduped case-insensitively; flows through the
   filter, dashboard breakdown, and reports.
8. **Exact figures behind the bands** — optional `budgetAmount` (coverage
   scoring) and `expectedCloseAt` (derives the timeline via `timelineFromDate`).
   The date's payoff is the Pipeline forecast.
9. **Editable, role-scoped WhatsApp templates** — `MessageTemplate` table,
   Manager/Admin **/templates** page (`manage_templates` permission); each
   template declares which roles can use it; placeholder validation rejects
   unknown `{tokens}` before they reach a customer; role gate re-checked
   server-side in `logWhatsAppContact`.

**Verified:** 64/64 Vitest tests pass, `tsc --noEmit` clean, `next build` clean.
Local dev DB is seeded with 4 users · 16 leads (varied ages and qualification
facts for realistic analytics) · 14 WhatsApp templates (3 Manager-only so the
role gate demos visibly).

**Repo:** GitHub `https://github.com/Xianyi1411/lead_management`, branch `main`.
**Deployment:** Vercel (fns pinned to `sin1`) + Neon Postgres (Singapore); the
core app was deployed pre-Phase-2. Phase 2 code is committed locally but **not
pushed**.

## 3 · Recent commits (newest first, all local)

```
67931c6 Rework the system architecture slide for a non-technical audience
cb1b43f Three architecture slides for the pitch deck
d7b31c0 Segmented Available-to selector in the template dialog
d3e3312 Polish template-dialog controls + seed a 14-template demo library
f47f224 Exact budget/close-date behind the bands + editable role-scoped WhatsApp templates
f7034dd Extensible lead sources + stale-session hardening
120903a Phase 2: qualification gate, lead scoring, follow-ups, velocity analytics, reports
1335c22 Session handoff document for conversation migration          ← last pushed
```

The eight commits above `1335c22` are the entire Phase 2 delivery. Pushing
triggers a Vercel auto-deploy, which runs the `vercel-build` script; the new
columns / tables (see §5) are added to Neon via `prisma db push`.

## 4 · OPEN ITEMS — do these next

1. **Push the eight Phase-2 commits** (`git push` from
   `C:\Users\User\Desktop\lead_management`). Vercel auto-deploys and applies
   the schema changes to Neon.
2. **SECURITY — Neon DB password rotation.** Still open from the previous
   session's handoff (the live connection string was pasted twice in an older
   chat). Neon → Settings → Reset password → update `DATABASE_URL` in Vercel
   env vars → redeploy.
3. **Confirm the region fix** landed post-deploy: Vercel build log should show
   `sin1`; production should feel fast.
4. **Seed production for Phase 2 features** if you want the analytics demo
   populated on the live URL: point `DATABASE_URL` at Neon and run
   `npm run db:prod:seed` (see `docs/deploy.md` §4). **Wipes everything first**
   — only do this before a demo, never after real use.
5. **Rebrand check.** The presentation folder was renamed to
   `XeersLead-presentation.pptx` (mid-session, uncommitted decision), but the
   app wordmark still says **"Leadway"** (see `components/Rail.tsx`, login page,
   and `presentation/`). If XeersLead is the real name, do a project-wide rename
   in a small dedicated commit.
6. **Merge the three architecture slides** into the main deck: open
   `presentation/XeersLead-presentation.pptx` in PowerPoint → Insert → Reuse
   Slides → pick `XeersLead-architecture-slides.pptx` → tick "Keep source
   formatting". Three companion slides (ERD, plain-language architecture,
   project structure) match the deck's dimensions and tokens exactly.
7. **Verify production end-to-end once** after the push: log in as
   `hafiz@company.my` / `password123` → dashboard velocity strip populates →
   `/reports` renders → open a lead → qualification gate + follow-up + WhatsApp
   panel work → `/templates` lets you edit a template.

## 5 · What's in the database

The current schema (both `prisma/schema.prisma` for SQLite and
`prisma/schema.postgres.prisma` for Neon):

- **User** — id, name, email (unique), passwordHash, role (Role), isActive, createdAt.
- **Lead** — id, name, phone, email?, company?, source (built-in code or CustomSource name),
  status (LeadStatus), dealValue (Int RM), notes?, `budgetStatus` (BudgetStatus),
  `authority` (Authority), `timeline` (Timeline, always the effective one),
  `budgetAmount` Int?, `expectedCloseAt` DateTime?, `nextFollowUpAt` DateTime?,
  `lostReason` (LostReason?), assignedToId?, createdById, createdAt, updatedAt.
- **Activity** — id, leadId, userId, type (ActivityType incl. `FOLLOW_UP`),
  detail, createdAt.
- **CustomSource** (§14.7) — id, name (unique), createdAt.
- **MessageTemplate** (§14.9) — id, label (unique), body, roles (CSV of Role),
  createdAt, updatedAt.

## 6 · Environment facts (critical for the next session)

- **Windows 11**; the **user runs `cmd.exe`**, not PowerShell — give them
  `set "VAR=…"` syntax, not `$env:`.
- **Claude's shell:** PowerShell 5.1 + Git Bash. **Node is NOT on Claude's
  PATH** — prepend every command:
  `$env:Path="C:\Program Files\nodejs;$env:Path"` (Node v24 lives there).
  For npm scripts also prepend `C:\Users\User\Desktop\lead_management\node_modules\.bin`.
- **Project folder is `lead_management`** (underscore, no space). Older handoff
  drafts referenced "Lead Management" (with space) — that path is obsolete.
- **PowerShell gotcha:** paths containing `[id]` are treated as wildcards —
  always use `-LiteralPath` for the `app/(app)/leads/[id]` folder.
- **PowerShell commit-message gotcha:** double quotes inside a heredoc break
  the shell's argument passing. Use `git commit -F <path/to/msg.txt>` with the
  message pre-written to a scratchpad file.
- **No Python on the machine** (Microsoft Store stub only) — pptx tooling that
  needs Python won't run; use Node alternatives (`scripts/build-architecture-slides.cjs`
  uses pptxgenjs).
- **The in-app Browser pane can die** mid-session (viewport collapses to 0×0);
  visual verification then falls back to HTTP smoke checks via
  `Invoke-WebRequest`. Unit tests + typecheck + build still work fine.
- **Verification commands** (run all three before any commit that touches app
  code):

  ```powershell
  $env:Path="C:\Users\User\Desktop\lead_management\node_modules\.bin;C:\Program Files\nodejs;$env:Path"
  npm test          # 64 tests must pass
  npx tsc --noEmit  # must be clean
  npm run build     # must succeed (delete .next first if routes were added/removed)
  ```

- **Git:** commits end with `Co-Authored-By: Claude <model> <noreply@anthropic.com>`;
  the user pushes (their credentials); push → Vercel auto-deploy.
- **DB:** local = SQLite `file:./dev.db`; prod = Neon Postgres (Singapore,
  direct non-pooler URL). Never run `db:prod:seed` against prod after real use
  — it wipes.
- **Demo accounts** (all `password123`): aina@ (Admin), hafiz@ (Manager),
  huiting@ / farid@ (Reps) — `@company.my`.

## 7 · Working conventions (keep these or the project loses coherence)

1. **Every mutation is a server action** that re-checks session + `can()` +
   (for status) `canTransition()` server-side, writes an Activity row, then
   `revalidatePath`. Never trust the UI.
2. **Business rules live in pure `lib/` modules with tests** — five modules,
   64 tests. If a rule changes, change the module + its test together.
3. **Design changes go through DESIGN.md** — tokens/components/motion decisions
   are recorded there in the same edit that changes the code. Colour = pipeline
   stage, never decoration; iris = interactive only; WhatsApp green
   quarantined; temperature is on a separate hue-offset scale.
4. **Log AI work in `docs/ai-log.md`** (numbered entries, newest last) — it is
   scored competition material. Current tail: 12.
5. User feedback arrives in plain language — treat the symptom description as
   the spec, diagnose the real cause (see: "slow clicks" → region mismatch;
   "ugly button" → segmented control).
6. **Page-level guard is `requireUser()`** (`lib/auth.ts`), not the layout —
   App Router renders layout and page in parallel, so a stale session cookie
   used to crash pages that assumed a non-null user. `getCurrentUser()!` in
   pages is a regression.

## 8 · Known non-blockers

- Mobile bottom-tab bar not done — rail collapses to a 64px icon strip below
  920px, and the leads table doesn't restack to cards on phones. Fine for the
  competition demo (desktop).
- The custom `Dropdown` closes on any scroll outside itself — occasionally
  surprising in long forms but keeps the "focused control" mental model.
- WhatsApp still logs intent, not delivery (ADR-0002). The Business API upgrade
  path is documented but not built.
