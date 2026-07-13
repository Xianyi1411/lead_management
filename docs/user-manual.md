# Leadway — User Manual

How to use the Lead Management app, role by role. Vocabulary follows
[CONTEXT.md](../CONTEXT.md): **Lead**, **Status**, **Assignment**, **Activity**,
**WhatsApp Contact**, **Dashboard**.

## Signing in

Open the app and enter your email and password. There is no public sign-up —
accounts are created by an Admin. If you see *"That email and password don't
match"*, check both and try again; if your account was deactivated, ask an Admin.

**Demo accounts** (password for all: `password123`):

| Role | Email | Sees |
|---|---|---|
| Admin | aina@company.my | everything, plus Users |
| Manager | hafiz@company.my | all Leads, team Dashboard |
| Sales Rep | huiting@company.my / farid@company.my | only their assigned Leads |

Use **Log out** at the top right of any page to end your session.

---

## Everyone: finding your way around

- **Dashboard** — your role-scoped overview: KPI strip (total Leads, pipeline value
  in RM, won this month, conversion rate), the pipeline bar (each colour is a
  Status; width is the Lead count), Source breakdown, and the recent-Activity feed.
  The scope pill at the top right tells you what you're looking at: *System view*
  (Admin), *Team view* (Manager), or *My leads* (Sales Rep).
- **Leads** — the list. Search by name, phone, or company from the top bar of any
  page; narrow with the Status / Source / Rep dropdowns — picking an option applies
  it immediately (active filters light up purple; **Clear** resets). Click a Lead's
  name to open it.
- **Lead page** — four panels: **Lead info**, **Advance status**, **Activity**
  (the timeline — also the audit trail), and **Contact via WhatsApp**.

## Everyone: working a Lead

**Add a Lead — and the qualification gate** — *New lead* button → name and phone
are required; set the Source and Deal Value (RM) if known. If the lead came
through a channel that isn't in the Source list, click **+ Add a new source**
under the dropdown, type the name (e.g. "Google Ads"), and it's registered for
the whole team — it appears in the Source filter and all Source analytics from
then on. Then answer the three
**Qualification** questions: does the lead have **budget**, is your contact the
**decision maker**, and what's their **purchase timeline**? A **Fit Score**
(0–100) updates live as you answer, with a plain recommendation: *Strong fit* —
add and prioritise; *Medium fit* — add, but confirm budget/timeline early;
*Low fit* — consider parking it instead of spending calls on it. The score
advises; you decide. "Not sure yet" is always allowed — you can update the
answers later via *Edit lead* as you learn more. New Leads start as **New** and
unassigned.

**Move a Lead forward** — on the Lead page, the *Advance status* panel shows the
funnel: **New → Contacted → Qualified → Proposal → Won**. Only the legal next
steps appear as buttons — one step forward at a time, or **Mark Lost** from any
active Status. There is no way to jump (e.g. straight to Won); that's the
transition rule, not a bug. **Won** and **Lost** are frozen; only a Manager or
Admin can reopen.

**Mark a Lead Lost** — clicking *Mark Lost* asks **why** first: pick a reason
(price, competitor, went quiet, not interested, bad fit, other) and confirm. The
reason is recorded on the Lead and feeds the *Why we lose* report.

**Schedule a follow-up** — in the *Advance status* panel, pick a date and
**Schedule**. The date shows on the Leads table; when it passes, the Lead is
flagged **Overdue** in red and jumps to the top of the Dashboard's
**Needs attention** queue. Clear or reschedule any time. Leads with no activity
for 7+ days and no planned follow-up are flagged **Idle**.

**Read the Fit column** — every active Lead shows a temperature pill: **Hot**
(work it now), **Warm**, or **Cold**, from its Fit Score, funnel depth, and how
long it's been quiet. The **Focus** filter on the Leads page narrows to
*Overdue follow-up*, *Due today*, *Idle 7+ days*, or *Hot leads* — that's your
morning worklist.

**Contact via WhatsApp** — pick a Message Template (Intro, Follow-up, Proposal
follow-up), edit the preview text if you like, then **Open WhatsApp**. The app
opens WhatsApp with the message pre-filled and records a **WhatsApp Contact** in
the Activity timeline. Note: this logs your *intent to contact* at click time —
it does not confirm the message was sent or delivered.

**Add a note** — type into *"Add a note to the timeline…"* in the Activity panel.
Notes are permanent timeline entries (who, what, when).

**Edit a Lead** — *Edit lead* button on the Lead page (Reps: own Leads only).
Editing changes the Lead's details; it does not alter the timeline.

---

## Sales Rep

You own the Leads assigned to you. You can: see and edit **only your** Leads,
create new Leads, advance Status, WhatsApp your Leads, and add notes. You cannot
delete Leads, assign Leads (a Manager does that — newly created Leads wait
unassigned), or reopen Won/Lost Leads. Your Dashboard shows only your numbers.

**A typical day:** Dashboard → check your pipeline → open a Lead → WhatsApp them
with a template → when they reply, advance New → Contacted → add a note about the
conversation.

## Manager

You own the pipeline. Everything a Rep can do, plus: see **all** Leads, **assign**
a Lead to a Sales Rep (dropdown in the Lead info panel → *Assign*), **delete** a
Lead (button in Lead info → confirm inline; this removes its whole history — prefer
marking Lost), and **reopen** a Won or Lost Lead (Won reopens to Proposal; Lost
returns to where it fell out of the funnel). Your Dashboard is team-wide.

**Reports** (Managers and Admins only) — the analytics screen in the left rail:

- **Headline strip** — won all-time (RM), win rate of closed Leads, average sales
  cycle (created → Won), and average first response (Assignment → the Rep's first
  recorded touch).
- **Rep performance** — per Rep: open Leads, pipeline RM, won RM, win rate, and
  first-response time. Click a Rep's name to see their Leads.
- **Why we lose** — Lost Leads grouped by reason. If "price" dominates, that's a
  pricing conversation, not a rep problem.
- **Won value by source** — which Source produces actual revenue (not just lead
  count) — spend marketing effort accordingly.
- **Monthly outcomes** — won vs lost RM per month, dated by when the Lead actually
  closed.

The Dashboard's **Velocity** strip (all roles) reads the same history: average
days a Lead spends in each Status and the percentage that advances to the next —
the slowest stage with the lowest advance rate is where the funnel leaks.

**A typical flow:** a new Lead arrives unassigned → open it → assign to a Rep →
track it through the team Dashboard; step in to reopen or delete when needed.

## Admin

Everything a Manager can do, plus the **Users** page: add a user (name, email,
password of 8+ characters, Role), change a user's Role, and
**deactivate / reactivate** accounts. Deactivated users can't sign in, but their
history and assigned Leads are kept — there is no user deletion, by design. You
can't deactivate or change the role of your own account, so the system always has
at least one working Admin. Your Dashboard is system-wide.

---

## Quick answers

- **Why can't I see a Lead a colleague mentioned?** You're a Sales Rep and it isn't
  assigned to you. Ask a Manager to assign it.
- **Why is there no "Won" button on my Qualified Lead?** The funnel moves one step
  at a time: Qualified → Proposal → Won.
- **The Lead is Won/Lost and everything is frozen.** Correct — ask a Manager or
  Admin to reopen it.
- **Did my WhatsApp message send?** The app can't know — it records that you opened
  WhatsApp with the message ready. Check WhatsApp itself for delivery.
- **I deleted a Lead by mistake.** Deletion is permanent (that's why it's
  Manager/Admin-only and double-confirmed). Re-create the Lead; the old timeline
  can't be restored.
