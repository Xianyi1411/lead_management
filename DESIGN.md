# Lead Management — Design System

The visual and interaction spec for the app. Pairs with [BLUEPRINT.md](BLUEPRINT.md)
(what to build) and [CONTEXT.md](CONTEXT.md) (the vocabulary). A rendered reference
of every screen lives at [`design/mockup.html`](design/mockup.html) — open it in a
browser to see this document realised.

> **Register:** product UI (design *serves* the task), not a marketing page. The bar
> is earned familiarity — Linear / Stripe-grade trust. The tool should disappear into
> the work.

---

## 1. Thesis & the one risk

**Thesis.** Reps glance at this on a phone in the field in bright daylight; managers
scan the whole pipeline at a desk between calls. So: **light theme** (all-day
legibility under bright ambient light) and **density over decoration**.

**The identity is the pipeline, not a logo.** Instead of anchoring the brand on an
accent colour, the identity is a **fixed six-colour status spectrum** used as a
*data-encoding system*. The same six colours are the dashboard funnel bar, the status
pills on every row, the lead-detail stepper, and the logo mark. Colour always means
"where in the funnel" — never decoration. The interactive accent (Iris) is
deliberately quiet: it only ever means "you can click this."

---

## 2. Colour tokens

Cool neutrals (explicitly **not** cream/sand), one quiet interactive accent, a
quarantined WhatsApp green, and the functional pipeline spectrum.

### Neutrals & accent

| Token | Hex | Role |
|---|---|---|
| `--fog` | `#F7F8FA` | app canvas / page background |
| `--surface` | `#FFFFFF` | cards, table rows, panels |
| `--rail` | `#171922` | dark left nav rail (second neutral layer) |
| `--rail-hi` | `#232634` | rail hover |
| `--ink` | `#1C1F27` | primary text |
| `--slate` | `#5B6170` | secondary/muted text (5.8:1 on white ✓) |
| `--mist` | `#E6E8EE` | borders, dividers |
| `--mist-2` | `#EEF0F4` | subtle fills, tracks, zebra |
| `--iris` | `#4A45E0` | **interactive only**: primary buttons, current nav, selection, focus ring |
| `--iris-soft` | `#ECEBFB` | iris hover/selected tint |
| `--wa` | `#1FA855` | **WhatsApp action only** |

**Rule:** Iris is never used decoratively. If a coloured element isn't clickable and
isn't a pipeline stage, it's a neutral. Green is never used for anything except the
WhatsApp verb and the Won stage.

### The pipeline spectrum (the signature)

Ordered cool→warm as the lead heats up; Won breaks to confident green, Lost to the
rose off-ramp. `text` = pill text + dot + funnel segment; `tint` = pill background.

| Stage | `text` | `tint` |
|---|---|---|
| New | `#64748B` | `#EEF1F5` |
| Contacted | `#2F6FED` | `#E9F0FE` |
| Qualified | `#0E9AA7` | `#E2F4F5` |
| Proposal | `#D98A0B` | `#FBF0DC` |
| Won | `#17915B` | `#E4F3EA` |
| Lost | `#D2453E` | `#FBE9E8` |

Pill text colours are darkened one notch from `text` for AA contrast on the tint:
New `#475264`, Contacted `#1D54C4`, Qualified `#0B7580`, Proposal `#A5680A`,
Won `#0F7147`, Lost `#B23A34`.

### Drop-in CSS custom properties

```css
:root{
  --fog:#F7F8FA; --surface:#FFFFFF; --rail:#171922; --rail-hi:#232634;
  --ink:#1C1F27; --slate:#5B6170; --mist:#E6E8EE; --mist-2:#EEF0F4;
  --iris:#4A45E0; --iris-soft:#ECEBFB; --iris-ring:rgba(74,69,224,.35); --wa:#1FA855;
  --new:#64748B;--new-t:#EEF1F5; --contacted:#2F6FED;--contacted-t:#E9F0FE;
  --qualified:#0E9AA7;--qualified-t:#E2F4F5; --proposal:#D98A0B;--proposal-t:#FBF0DC;
  --won:#17915B;--won-t:#E4F3EA; --lost:#D2453E;--lost-t:#FBE9E8;
}
```

### Tailwind theme extension (`tailwind.config.ts`)

```ts
theme: {
  extend: {
    colors: {
      fog:'#F7F8FA', surface:'#FFFFFF', rail:{DEFAULT:'#171922', hi:'#232634'},
      ink:'#1C1F27', slate:'#5B6170', mist:{DEFAULT:'#E6E8EE', 2:'#EEF0F4'},
      iris:{DEFAULT:'#4A45E0', soft:'#ECEBFB'}, wa:'#1FA855',
      stage:{
        new:'#64748B', contacted:'#2F6FED', qualified:'#0E9AA7',
        proposal:'#D98A0B', won:'#17915B', lost:'#D2453E',
      },
    },
  },
}
```

Keep the `LeadStatus` enum → colour mapping in one module (e.g. `lib/status-ui.ts`)
so pills, the funnel, and the stepper never drift apart:

```ts
export const STATUS_UI = {
  NEW:       { label:'New',       text:'#475264', dot:'#64748B', tint:'#EEF1F5' },
  CONTACTED: { label:'Contacted', text:'#1D54C4', dot:'#2F6FED', tint:'#E9F0FE' },
  QUALIFIED: { label:'Qualified', text:'#0B7580', dot:'#0E9AA7', tint:'#E2F4F5' },
  PROPOSAL:  { label:'Proposal',  text:'#A5680A', dot:'#D98A0B', tint:'#FBF0DC' },
  WON:       { label:'Won',       text:'#0F7147', dot:'#17915B', tint:'#E4F3EA' },
  LOST:      { label:'Lost',      text:'#B23A34', dot:'#D2453E', tint:'#FBE9E8' },
} as const;
```

---

## 3. Typography

One UI family carries everything; a mono face carries numbers. Pairing proportional
sans against monospaced is a real contrast axis *and* functional — figures align down
a column.

- **UI:** `Inter` → `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
- **Numerics:** `IBM Plex Mono` → `ui-monospace, 'Cascadia Mono', Consolas, monospace`,
  always with `font-variant-numeric: tabular-nums`. Use for **every** RM value, KPI,
  count, phone number, and date.

**Scale — fixed px, not fluid** (product UIs view at consistent DPI):

| px | Weight | Use |
|---|---|---|
| 11–12 | 500/600 | column headers, eyebrow labels (uppercase, `+0.04em`) |
| 13 | 400/500 | meta, captions |
| 14 | 400 | base body, table cells |
| 16 | 500 | emphasised body |
| 18 | 600 | section titles |
| 20 | 600 | page title |
| 24–30 | 600 | KPI numbers (mono, tabular) |

`text-wrap: balance` on headings. Body prose capped at 65–75ch; dense tables may run wider.

---

## 4. Primitives

| Token | Value |
|---|---|
| Radius | cards/inputs `9px`, small controls `6px`, pills/avatars `99px`. **Never >16px on cards.** |
| Shadow | `0 1px 2px rgba(16,18,27,.04), 0 4px 12px rgba(16,18,27,.05)` — one soft elevation. Don't pair with a 1px border *and* wide shadow on the same element. |
| Border | `1px solid var(--mist)` |
| Spacing | 4px base; section gaps 18–26px; card padding 16–20px. Vary for rhythm. |
| Focus ring | `2px solid var(--iris)` + `3px var(--iris-ring)` halo on inputs. Visible on **every** interactive element. |
| z-index | `dropdown 10 → topbar 20 → rail 30 → modal-backdrop 40 → modal 50 → toast 60`. No `9999`. |

---

## 5. Components (each ships all states)

Every interactive component defines default / hover / focus / active / disabled /
loading / error. Skeletons for loading, never a centred spinner.

**Buttons.** Primary = solid Iris, white text, hover darken + soft ring. Ghost =
white surface + `--mist` border, hover `--mist-2` fill. WhatsApp = solid `--wa`. Same
height (36px), same radius (6px) everywhere — a "save" button looks identical on every
screen. `:active` nudges 0.5px.

**Status pill.** Tint background + coloured dot + darkened text label. Status is
**never colour-alone** — the text label always accompanies the dot (accessibility).

**Inputs.** 36–40px, `--mist` border, Iris focus ring. Placeholder text at `--slate`
(meets 4.5:1 — not a pale grey).

**Filter bar.** Three distinct levels so component roles read at a glance:
(1) selects are visibly dropdowns — custom chevron, ink text — and switch to an
**iris border + iris-soft tint** when a filter is applied, so active filters are
obvious; (2) the apply action is a **soft-iris secondary button** (`.btn-soft`) —
above ghost, below the solid-iris primary; (3) the result count and Clear are quiet
text-level elements that don't compete. Hierarchy: solid iris (primary action) →
soft iris (bar action) → bordered white (inputs) → plain text (info).

**Table.** Uppercase 11px column headers on a **`--mist-2` header band** — clearly a
different colour from the data rows; 13.5px cells; `--mist-2` row dividers; even rows
zebra-tinted `#FAFBFD`; hover row `#F4F4FE` (stronger than the zebra so it always
reads). RM values right-aligned, mono, tabular.
Unassigned rep renders as an em-dash label, never blank. Row hover reveals a WhatsApp
quick-action glyph. On mobile the table collapses to stacked cards.

**Card.** White surface, `--mist` border, one soft shadow, `9px` radius. Uppercase
section header with a bottom divider. **Never nest cards.**

**Avatar.** 24–30px circle, initials, stage/role-tinted background, white text.

**Stepper (lead detail).** Horizontal nodes for New→Contacted→Qualified→Proposal→Won.
Done = teal filled; current = white node with teal ring; future = grey. It renders the
**transition rule directly**: only legal next moves appear as buttons (from Qualified:
"Move to Proposal", "Mark Lost"). The illegal jump is never rendered — no disabled
button, it simply isn't offered. Won/Lost render frozen with a Manager/Admin-only
"Reopen".

**WhatsApp panel.** Template chips (Intro / Follow-up / Proposal follow-up), an
editable preview with placeholders filled from the lead (`{leadName} {company}
{repName}`), and a solid-green "Open WhatsApp" button. Caption states it logs *intent
to contact, not proof of delivery* (per ADR-0002).

**Activity timeline.** Vertical rail with stage/action-coloured dots; each entry is
"what · who · when". Reuses the spectrum colours + Iris (assignment) + `--wa` (WhatsApp).

---

## 6. Layout & shell

**Dark graphite left rail + light content.** The dark rail gives the app a spine and
makes the spectrum colours pop off the light canvas.

```
┌────────┬──────────────────────────────────────────────┐
│ rail   │ topbar: page title · search · scope · +Lead   │
│ 240px  ├──────────────────────────────────────────────┤
│ graphite│ content on --fog, white surfaces             │
│        │                                                │
│ • mark │                                                │
│ • nav  │                                                │
│ • scope│                                                │
│ • user │                                                │
└────────┴──────────────────────────────────────────────┘
```

- **Rail:** brand lockup · nav (Dashboard, Leads, Users) · scope note · user chip with
  role badge (identity only — sign-out lives in the topbar). **Users is hidden for
  non-Admins.** The brand lockup is always **horizontal**: mark beside the "Leadway"
  wordmark, identical on login and in the rail (no stacked subtitle). The mark itself
  is **five ascending bars** in the stage colours, New → Won — the funnel's happy path
  (Lost is deliberately excluded).
- **Topbar:** sticky, translucent-blur; page title, global search, a **scope pill**
  (System / Team / My leads — reflects the viewer's role), primary action, and a
  labelled **Log out** button at the far right on every page.
- **Responsive:** rail 240px → 64px icon strip (≤920px) → bottom tab bar (mobile).
  Responsive behaviour is *structural* (collapse rail, stack columns, table→cards),
  never fluid typography.

---

## 7. Motion — "refined & smooth"

The chosen level: modern and alive, feedback on every interaction, but never
decorative or exhausting for all-day use. Reads premium (Linear / Vercel / Stripe),
not "animated everywhere." Standard easing `cubic-bezier(.22,1,.36,1)` (ease-out-quart),
150–250ms for feedback, 400–950ms for orchestrated moments.

**Feedback (always on).**
- Buttons lift 1px on hover, press 0.5px on active; ghost/primary/WhatsApp all share it.
- Table rows tint on hover; the WhatsApp quick-action glyph eases + slides in.
- Template chips and inputs animate border/background; focus rings appear crisply.

**State-change moments (the demo-worthy ones).**
- **Status advance** flushes the header pill to its new colour (`background`/`color`
  transition + a subtle scale pulse), fills the next **stepper** node, and drops a new
  **activity-timeline** entry that slides in from the top. Fully wired in the mockup —
  advancing / marking Lost / reopening all animate and enforce the transition rule.
- **Funnel** wipes in left-to-right (`clip-path`) on dashboard load.
- **KPI numbers count up** (ease-out-cubic, ~950ms) on dashboard load.

**Entrance choreography.**
- Screen changes crossfade + rise (~340ms). Dashboard KPIs, then the pipeline, then
  the two lower cards **stagger in**; leads rows and detail cards stagger on their
  screens. A short orchestrated sequence — not every element bouncing.

**Robustness (non-negotiable).**
- Reveal/entrance animations only ever *enhance an already-visible default* — the base
  DOM is fully visible, so if scripting is off or the tab is backgrounded (rAF
  throttled) nothing ships blank. Count-up carries a `setTimeout` fallback to the final
  value for the same reason.
- `@media (prefers-reduced-motion: reduce)` disables every transition/animation; JS
  motion paths check the same media query and jump straight to final state.
- No animation on layout-thrashing properties; transform/opacity/clip-path/colour only.

**Implementation note.** In the React build, prefer CSS transitions + the Web Animations
API for these (as the mockup does). Reach for a library (Framer Motion / `motion`) only
if list reordering or shared-element transitions need it — don't add the dependency for
what CSS already does well.

---

## 8. Accessibility floor

- Body text ≥4.5:1, large text ≥3:1 — verified against the palette above.
- Visible Iris focus ring on every interactive element.
- Status conveyed by **label + colour**, never colour alone.
- Full keyboard reachability; hit targets ≥32px.

---

## 9. Screens

Role changes the **scope and numbers**, never the layout. Admin = system-wide,
Manager = team-wide, Sales Rep = own leads only + a "My leads" scope pill.

- **Login.** Centred card on Fog, spectrum mark, email + password, one Iris "Sign in".
  No public sign-up ("accounts are created by an Admin"). Error copy in the interface's
  voice: *"That email and password don't match. Try again."*
- **Dashboard.** Tabular KPI strip (Total leads · Pipeline value RM · Won this month ·
  Conversion) → the **pipeline funnel bar** (the hero) → source breakdown (calm neutral
  bars, not the spectrum) + recent activity feed.
- **Leads.** Search + Status/Source/Rep filters → dense table (pill, rep avatar,
  right-aligned RM, last activity, hover WhatsApp glyph). Empty state teaches:
  *"No leads match these filters. Clear them, or add a lead."*
- **Lead detail.** A **2×2 grid of four panels**: Lead info · Advance status (top
  row), Activity · WhatsApp (bottom row). Cards in the same row match heights, but
  each **row sizes to its own content** — compact info never gets stretched to match
  the tallest panel. The activity timeline scrolls inside its panel (cap 380px). The
  stepper offers legal-only moves; single column on mobile.

**Layout note (client decision):** every content screen runs **full width** — there
is no max-width cap on the content container.

**Create flows are centered dialogs (client decision).** "New lead" and "Add user"
are primary buttons at the top right that open a **centered modal** with the form —
a deliberate exception to the modal-averse product default, executed on the native
`<dialog>` element: true top-layer (no z-index hacks), backdrop dim + blur, Escape
and backdrop-click close, entrance animation honouring reduced-motion. Dialogs close
themselves on success (user create, lead edit) or hand off to the new record's page
(lead create). **Edit lead** uses the same dialog pattern, triggered by the ghost
button in the detail title row.

**Still to design when built** (not yet in the mockup): Users (Admin) table + create/
deactivate, the New-lead form, the Sales-Rep-scoped dashboard, and the loading/empty/
error states for each surface.

---

## 10. Anti-patterns — do not reintroduce

Deliberately avoided; a future change that adds one is a regression.

- ✗ Cream / sand / beige background → cool `--fog`.
- ✗ Four big-number gradient KPI cards (hero-metric cliché) → tabular strip.
- ✗ WhatsApp green as the brand → green quarantined to the WhatsApp verb + Won.
- ✗ Numbered section markers / uppercase tracked eyebrow on every section → the funnel
  is the only real sequence; nothing else gets fake ordering.
- ✗ Side-stripe (`border-left`) accents; gradient text; glassmorphism as default.
- ✗ Card radius >16px; 1px border + wide drop shadow on the same element.
- ✗ Iris or full-saturation colour on inactive/decorative elements.

---

## 11. Naming

Working wordmark in the mockup is **"Leadway"** — placeholder, swap for the real name.
```
