# ADR-0003 — Rule-based lead scoring now, model-ready data capture for later

**Status:** accepted · 2026-07-13
**Context:** Blueprint §4 upgrade (qualification gate, fit score, temperature), CONTEXT.md "Qualification & scoring"

## Context

The team wants to qualify and segment leads **before** committing rep time to
calls, emails, and follow-ups — a score at intake that supports an add / park
decision. The obvious ambition is a trained prediction model ("will this lead
be won?"). Two facts make that premature today:

1. **No training data exists yet.** A supervised win-prediction model learns
   from *labelled outcomes*: for each historical lead, its features at intake
   and whether it ended Won or Lost. That label can only come from **this
   system's own lead history** — external/company-side data (industry, company
   size, revenue) can enrich the *features*, but it cannot supply the
   *outcomes*. A fresh deployment has ~15 seeded leads; a model needs
   **hundreds of closed leads minimum** (roughly 200–500 Won/Lost) before it
   beats a sensible hand-written rule, and thousands before it beats a tuned one.
2. **An unexplainable score would not be trusted.** Reps and managers need to
   argue with the score ("why is this lead cold?"). A black box at day one
   erodes trust in the whole system.

## Decision

**Ship a transparent, rule-based scoring engine now, and design the data model
so today's usage produces tomorrow's training set.**

- `lib/scoring.ts` — a pure, unit-tested module with documented weights:
  - **Fit score (0–100)** at intake: Budget (30) + Authority (25) + Timeline
    (25) + Source quality (10) + Deal-value band (10). Verdict bands: ≥65
    Qualify, 40–64 Review, <40 Nurture. Shown live in the Add-lead dialog as
    the **qualification gate**; it advises, never blocks — the human decides.
  - **Temperature (Hot/Warm/Cold)** on active leads: fit score + funnel-depth
    bonus − inactivity decay − overdue-follow-up penalty.
- **Model-ready capture, starting now.** Every lead stores its qualification
  facts (`budgetStatus`, `authority`, `timeline`) as structured enums — these
  are the future feature vector. Every Lost lead stores a structured
  `lostReason`; every status change is a timestamped Activity row. The CREATED
  activity records the fit score at intake, so we can later measure how well
  the rule predicted the outcome (rule-vs-reality backtest).
- **The swap point is the function boundary.** `qualificationScore(input)` is
  the single interface; when enough closed-lead history exists, a trained
  model (start with logistic regression or gradient-boosted trees — tabular
  data, small feature set) replaces the rule *behind the same signature*, and
  the UI never changes. Until then the rule's weights can be tuned from the
  win/loss report.

## Consequences

- Scores are explainable line-by-line today (the dialog shows the guidance;
  `qualificationParts()` exposes the breakdown), at the cost of not learning
  from data yet.
- The system accumulates a clean labelled dataset as a side effect of normal
  use: qualification enums + source + deal value (features), win/loss +
  lost reason + cycle times (labels/diagnostics).
- Revisit when ~200+ leads have closed: backtest intake fit scores against
  actual outcomes; if a simple trained model beats the rule on held-out leads,
  swap it in behind `qualificationScore()`.
