# HANDOFF — session state for the next conversation

> Purpose: this file lets a brand-new AI conversation (or a human) pick up exactly
> where the previous session ended, with zero lost context. Read this first, then
> the docs it points to. Written 2026-07-12.

---

## 1 · What this project is

**Leadway** — a lead-management web app for the *AI Lead Management Challenge*
(judged on AI usage across the lifecycle; presentation is **Tuesday**). One person
+ Claude Code built it end-to-end. Scoring: Working app 30 · System design 20 ·
AI prompts 20 · Quality/docs 20 · Presentation 10.

**Source-of-truth documents (read in this order):**

| File | What it holds |
|---|---|
| [BLUEPRINT.md](BLUEPRINT.md) | The full build spec — features, roles, ERD, rules, demo script |
| [CONTEXT.md](CONTEXT.md) | Domain glossary (the agreed vocabulary — use these words) |
| [DESIGN.md](DESIGN.md) | Visual system: tokens, components, motion, layout decisions |
| `docs/adr/` | ADR-0001 (Next.js/Vercel/Postgres), ADR-0002 (WhatsApp logs intent) |
| [docs/deploy.md](docs/deploy.md) | Vercel + Neon runbook (GitHub flow — user chose GitHub, *not* GitLab) |
| [docs/user-manual.md](docs/user-manual.md) | Per-role how-to, demo accounts |
| [docs/ai-log.md](docs/ai-log.md) | The 9-entry AI-usage story (judged material — keep appending) |
| `design/mockup.html` | The approved clickable design mockup (historical reference) |
| `presentation/Leadway-presentation.pptx` | The 13-slide competition deck with speaker notes |

## 2 · Current state — everything is DONE except the checklist in §4

- **App complete** against Blueprint §4: login/roles/sessions, lead CRUD (create +
  edit as centered dialogs, delete with inline confirm), assignment, 6-stage funnel
  with server-enforced transitions + Manager/Admin reopen, role-scoped dashboard
  (KPIs, pipeline spectrum bar, sources, activity feed), search + instant filters,
  WhatsApp contact (see §5), per-lead timeline + notes, Users admin (create / set
  role / deactivate with self-lockout guards).
- **Verified:** 28/28 Vitest tests, `tsc --noEmit` clean, `next build` clean
  (last run on Next **14.2.35** after the security patch).
- **Deployed and working:** Vercel (functions pinned to **Singapore `sin1`** via
  `vercel.json`) + Neon Postgres (Singapore). Production was seeded via
  `npm run db:prod:seed`. Local dev stays on SQLite (`prisma/dev.db`) as the
  offline demo fallback — **dual Prisma schemas**: `prisma/schema.prisma` (SQLite,
  dev) and `prisma/schema.postgres.prisma` (prod); `vercel-build` script handles
  prod generate + db push automatically.
- **Repo:** GitHub `https://github.com/Xianyi1411/lead_management`, branch `main`.
- **UI system:** custom `Dropdown` component replaced ALL native selects; create/edit
  flows are native-`<dialog>` modals; full-width layouts; motion layer (count-up
  KPIs, funnel wipe, staggered reveals, pill flush) — all documented in DESIGN.md.

## 3 · Session history in one paragraph (the logic to follow)

Blueprint/glossary already existed → designed the UI direction (thesis: *the
identity is the pipeline* — six stage colours as data-encoding; light theme; Inter +
IBM Plex Mono) → built and approved `design/mockup.html` with "refined & smooth"
motion → captured DESIGN.md → scaffolded Next.js 14 + Prisma + Vitest (three pure,
tested rule modules: `lib/transitions.ts`, `lib/permissions.ts`, `lib/whatsapp.ts`)
→ built all screens/actions → iterated from the user's plain-language feedback (logo
redesign to 5 ascending bars; 2×2 detail grid; topbar logout; filter hierarchy;
table header band + zebra; full-width; dialogs; custom dropdowns) → verified →
deployed (found + fixed the big one: functions were in US-East while DB is in
Singapore → pinned `sin1`) → patched Next → built the presentation deck.
Every phase is logged with its prompts in `docs/ai-log.md`.

## 4 · OPEN ITEMS — confirm/do these in the next session

1. **Push the last commit.** `3afc246` (presentation deck) is committed locally but
   **not pushed**. `git push` from `C:\Users\User\Desktop\Lead Management`.
   Pushing auto-deploys on Vercel (harmless — deck + docs only).
2. **SECURITY — rotate the Neon database password.** The live connection string
   (including password) was pasted into the previous chat twice. Neon dashboard →
   project → Settings → Reset password → update `DATABASE_URL` in **Vercel env
   vars** → redeploy. Not confirmed done.
3. **Deck finishing:** open `presentation/Leadway-presentation.pptx` in PowerPoint,
   (a) replace the `your-app.vercel.app` placeholder on the closing slide with the
   real URL, (b) visual once-over — it was structurally QA'd but never rendered
   (no PowerPoint/LibreOffice on the build machine). Report any broken slide by
   number for regeneration (generator source: scratchpad `deck.cjs`, pptxgenjs).
4. **Confirm the region fix landed:** latest Vercel build log should show `sin1`;
   clicking around production should feel fast now. (The fix was pushed, but the
   user never confirmed the after-feel.)
5. **Verify production end-to-end once:** log in as `hafiz@company.my` /
   `password123` on the live URL; run one lap of the demo script (Blueprint §11 /
   deck slide 10 notes).
6. **WhatsApp end-to-end test on a real phone** — see §5. The user said they will
   "implement it" next conversation: **confirm what they mean** — most likely
   (a) testing/fixing the existing click-to-chat on the deployed app, or
   (b) the WhatsApp **Business API** upgrade (ADR-0002's documented upgrade path).
   Ask, then use §5.
7. **Demo rehearsal:** two browser windows (Manager + Rep), local fallback
   (`npm run dev`, SQLite) tested, Neon warmed before presenting (free tier sleeps
   when idle — first request ~1s).
8. Optional/known gaps (fine to skip for the competition): mobile bottom-tab bar
   (rail currently collapses to a 64px icon strip), leads table → stacked cards on
   phones.

## 5 · THE WHATSAPP METHOD (marked down for next session)

### How it works today — click-to-chat, logs intent (ADR-0002)

**Flow:** Lead page → *Contact via WhatsApp* panel → pick a template chip (Intro /
Follow-up / Proposal follow-up) → placeholders auto-fill from the lead
(`{leadName}` `{company}` `{repName}`) → user may edit the preview textarea →
**Open WhatsApp** button:
1. `window.open(buildWaLink(phone, message), "_blank")` — opens
   `https://wa.me/<normalized-phone>?text=<url-encoded message>` (WhatsApp Web on
   desktop, the app on mobile). Opened synchronously in the click handler so popup
   blockers allow it.
2. Then the server action `logWhatsAppContact(leadId, templateKey)` writes a
   `WHATSAPP_CONTACT` Activity ("Intro template" etc.) to the lead's timeline.

**The system records the *intent to contact at click time* — NOT that a message was
sent or delivered.** That is a deliberate, documented decision (ADR-0002); the
in-app caption says so, and the deck/Q&A prep covers it.

**Where the code lives:**

| Piece | File |
|---|---|
| Pure logic: `normalizePhone`, `fillTemplate`, `buildWaLink`, `TEMPLATES` | [lib/whatsapp.ts](lib/whatsapp.ts) |
| Unit tests (7) for all of the above | [tests/whatsapp.test.ts](tests/whatsapp.test.ts) |
| UI panel (client): chips, editable preview, open+log | [components/WhatsAppPanel.tsx](components/WhatsAppPanel.tsx) |
| Server action: permission-checked logging | `logWhatsAppContact` in [app/(app)/leads/actions.ts](app/(app)/leads/actions.ts) |
| Permission rule (`whatsapp_contact`: Manager/Admin any lead; Rep own only) | [lib/permissions.ts](lib/permissions.ts) |

**Phone normalization rule (Malaysia-aware):** strip all non-digits; a leading `0`
becomes country code `60` (so `012-345 6789` → `60123456789`). Numbers already in
international form pass through. wa.me requires digits only — no `+`, spaces, or
dashes.

**Template texts** are fixed in `TEMPLATES` (Blueprint §10 wording). `fillTemplate`
falls back to "your team" when the lead has no company.

**How to test it end-to-end:** open a seeded lead on the deployed app → pick Intro →
Open WhatsApp → on a phone with WhatsApp, the chat opens pre-filled to the lead's
number; check the lead's timeline shows the `WHATSAPP_CONTACT` entry. Note the seed
data uses **fake numbers** — for a real test, edit a lead to your own phone number
first.

### If "implement" means the Business API upgrade (delivery receipts)

Documented upgrade path, not yet built: WhatsApp **Business Platform (Cloud API)** —
Meta developer account + verified business + a registered WhatsApp Business number →
server-side send via `POST /<phone-number-id>/messages` with a Bearer token (env
var, never client-side) → pre-approved message templates replace free-text for
business-initiated messages → webhook endpoint (new route, e.g.
`app/api/whatsapp/webhook`) receives `sent / delivered / read` statuses → extend
`Activity` records (or a new field) from "intent" to actual delivery states.
Costs money per conversation and requires Meta business verification — which is why
the competition build logs intent instead. Keep ADR-0002 updated if this is built.

## 6 · Environment facts (critical for the next session)

- **Windows 11**; the **user runs `cmd.exe`**, not PowerShell — give them `set "VAR=…"`
  syntax, not `$env:`. (This bit them twice during deploy.)
- **Claude's shell:** PowerShell 5.1 + Git Bash. **Node is NOT on Claude's PATH** —
  prepend every command:
  `$env:Path="C:\Program Files\nodejs;$env:Path"` (Node v24.18.0 lives there).
  For npx/local bins also prepend `C:\Users\User\Desktop\Lead Management\node_modules\.bin`.
- **No Python on the machine** (Microsoft Store stub only) — pptx/pdf tooling that
  needs Python won't run; use Node alternatives (deck was built with pptxgenjs).
- **PowerShell gotcha that caused a real bug:** paths containing `[id]` are treated
  as wildcards — always use `-LiteralPath` for the `app/(app)/leads/[id]` folder.
- **Verification commands** (run all three before any commit that touches app code):
  ```powershell
  $env:Path="C:\Users\User\Desktop\Lead Management\node_modules\.bin;C:\Program Files\nodejs;$env:Path"
  npm test          # 28 tests must pass
  npx tsc --noEmit  # must be clean
  npm run build     # must succeed (delete .next first if routes were added/removed)
  ```
- **Git:** commits end with `Co-Authored-By: Claude <model> <noreply@anthropic.com>`;
  the user pushes (their credentials); push → Vercel auto-deploy.
- **DB:** local = SQLite `file:./dev.db`; prod = Neon Postgres (Singapore, direct
  non-pooler URL). Never run `db:prod:seed` against prod after real use — it wipes.
- **Demo accounts** (all `password123`): aina@ (Admin), hafiz@ (Manager),
  huiting@ / farid@ (Reps) — `@company.my`.

## 7 · Working conventions (keep these or the project loses coherence)

1. **Every mutation is a server action** that re-checks session + `can()` +
   (for status) `canTransition()` server-side, writes an Activity row, then
   `revalidatePath`. Never trust the UI.
2. **Design changes go through DESIGN.md** — tokens/components/motion decisions are
   recorded there in the same edit that changes the code. Colour = pipeline stage,
   never decoration; iris = interactive only; WhatsApp green quarantined.
3. **Business rules live in pure `lib/` modules with tests** — if a rule changes,
   change the module + its test together.
4. **Log AI work in `docs/ai-log.md`** (numbered entries, newest last) — it is
   scored competition material.
5. User feedback arrives in plain language — treat the symptom description as the
   spec, diagnose the real cause (see: "slow clicks" → region mismatch).
