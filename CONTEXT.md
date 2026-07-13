# Lead Management

A web application for capturing sales leads, assigning them to sales reps, tracking their progress through a pipeline, and logging outreach (primarily via WhatsApp). Built for the AI Lead Management Challenge.

## Language

### People

**User**:
A person who can log in to the system. Every User has exactly one Role.
_Avoid_: Account, member

**Role**:
The permission level of a User. One of: Admin, Manager, Sales Rep.

**Admin**:
A User who owns the system: manages Users (create, deactivate, set Roles) and has all Manager capabilities. Sees the system-wide Dashboard.
_Avoid_: Superuser, owner

**Manager**:
A User who owns the pipeline: full Lead CRUD (including delete), assigns Leads to Sales Reps, sees all Leads and the team-wide Dashboard. Cannot manage Users.
_Avoid_: Supervisor, team lead

**Sales Rep**:
A User who owns their assigned Leads: views and edits only Leads assigned to them, creates new Leads, updates Status, and contacts Leads via WhatsApp. Cannot delete or assign Leads. Sees a personal Dashboard.
_Avoid_: Agent, salesperson, rep (in docs — "Rep" is fine in conversation)

### Pipeline

**Lead**:
A potential customer being pursued — a named person/company with contact details, tracked through the pipeline. Every Lead has exactly one Status.
_Avoid_: Prospect, contact, customer

**Assignment**:
The act of a Manager or Admin designating one Sales Rep as responsible for a Lead. A Lead has at most one assigned Sales Rep at a time.
_Avoid_: Allocation, routing

**Status**:
Where the conversation with a Lead currently stands. One of six values forming the funnel: New → Contacted → Qualified → Proposal → Won / Lost.
_Avoid_: Stage, state, phase

**New**:
A Lead nobody has spoken to yet.

**Contacted**:
A Lead that has received at least one outreach (e.g. WhatsApp message).

**Qualified**:
A Lead confirmed to have genuine need and budget — worth serious sales effort.
_Avoid_: Hot lead

**Proposal**:
A Lead that has been sent a concrete offer or quotation.
_Avoid_: Negotiation

**Won**:
Terminal Status — the Lead became a customer. Frozen once set; only a Manager or Admin can reopen.
_Avoid_: Closed, converted, deal

**Lost**:
Terminal Status — the pursuit ended without a sale. Reachable from any active Status. Frozen once set; only a Manager or Admin can reopen.
_Avoid_: Dead, dropped, closed-lost

**Transition rule**:
The business rule governing Status changes: forward one step at a time; any active Status may move to Lost; terminal Statuses are frozen except reopening by Manager/Admin.

**Source**:
The channel through which a Lead entered. Six built-ins — Website, Referral, Walk-in, Social Media, Event, Other — plus any **custom Sources** the team registers via "+ Add a new source" when adding or editing a Lead (e.g. "Google Ads"). Custom Sources are registered names shared by the whole team, never free text, so Source analytics stay grouped.
_Avoid_: Channel, origin

**Deal Value**:
The estimated worth (in RM) of the sale if the Lead is Won. Summed across active Leads it gives the pipeline value.
_Avoid_: Amount, price, revenue

### Outreach

**WhatsApp Contact**:
The act of a User opening a pre-filled WhatsApp click-to-chat link for a Lead from within the app. Recorded as an Activity at click time — the system logs intent to contact, not proof of delivery.
_Avoid_: Message sent, chat

**Activity**:
A single recorded event in a Lead's history: a WhatsApp Contact, a Status change, an Assignment, a note, or the Lead's creation. Always carries who, what, and when.
_Avoid_: Log entry, event, interaction

**Activity Log**:
The chronological timeline of all Activities for one Lead. Doubles as the audit trail.
_Avoid_: History, audit log (as separate concepts — they are the same thing here)

**Message Template**:
A predefined WhatsApp message text with placeholders for the Lead's name, company, and the sending User's name. Templates are managed by Managers/Admins on the Templates page (create, edit, delete) and each declares which Roles may use it — a User only sees their Role's templates in the WhatsApp panel. The user picks one, may edit the preview, then opens WhatsApp. Three built-ins ship by default: Introduction, Follow-up, Proposal follow-up.
_Avoid_: Canned message, script

### Qualification & scoring

**Qualification**:
The three BANT-style facts captured when a Lead is added (and editable later): Budget (confirmed / likely / not sure / none), the contact's Authority (decision maker / influencer / not sure), and the purchase Timeline (within a month / this quarter / this year / none yet). Two optional exact figures sit behind the bands: the customer's stated **budget amount** (RM) and the **expected purchase date** — when the date is known it replaces the hand-picked Timeline entirely.
_Avoid_: Lead form extras, survey

**Fit Score**:
A 0–100 score computed by a fixed, documented rule (ADR-0003) from the Qualification facts plus Source quality and Deal Value band. Shown live in the Add-lead dialog as the qualification gate: it advises whether the Lead is worth adding before anyone spends outreach time on it. The human always makes the final call.
_Avoid_: AI score, probability

**Verdict**:
What the Fit Score recommends at intake: **Strong fit** (≥65 — add and prioritise), **Medium fit** (40–64 — add but confirm budget/timeline early), **Low fit** (<40 — consider parking it).

**Temperature**:
How urgently an active Lead should be worked right now: Fit Score + funnel-depth bonus, cooled by inactivity and overdue Follow-ups. Bands: **Hot** (≥70), **Warm** (45–69), **Cold** (<45). Terminal Leads have no Temperature.
_Avoid_: Priority, ranking

**Follow-up**:
The scheduled date of the next planned touch on a Lead. Overdue Follow-ups surface in the Dashboard's Needs-attention queue and as red flags on the Leads table.
_Avoid_: Reminder, task

**Lost Reason**:
Why a Lead was Lost, chosen from a fixed list when marking Lost: price too high, chose a competitor, went quiet, not interested, bad fit, other. Feeds the win/loss report.

### Reporting

**Dashboard**:
The role-scoped overview screen: KPI cards (total Leads, pipeline value, won this month, conversion rate), a Status funnel chart, the Velocity strip, the Needs-attention queue, Hottest Leads, a Source breakdown, and a recent-Activity feed. Admin sees system-wide, Manager team-wide, Sales Rep personal.
_Avoid_: Home page, report

**Pipeline value**:
The sum of Deal Values across all active (non-terminal) Leads in the viewer's scope.

**Velocity**:
Time-based pipeline analytics reconstructed from STATUS_CHANGE Activities: average days a Lead spends in each Status, the share of Leads that advance from each Status to the next, and the average sales cycle (created → Won).
_Avoid_: Speed, throughput

**First Response Time**:
Hours between a Lead's Assignment and the assigned Sales Rep's first recorded touch on it (WhatsApp Contact, note, or Status change). Reported per Sales Rep.

**Reports**:
The Manager/Admin-only analytics screen: per-Rep performance (open Leads, pipeline, won, win rate, First Response Time), lost-reason breakdown, won value by Source, the Pipeline Forecast, and monthly Won/Lost outcomes.

**Pipeline Forecast**:
Active-Lead Deal Value grouped by expected purchase date — this month, the next two months, later, and a "no date" bucket. Built from `expectedCloseAt`; the "no date" bucket doubles as a hygiene nudge to capture dates.

## Example dialogue

> **Dev:** A visitor filled the website form — is that a Lead already?
> **Expert:** Yes. The moment it's captured it's a Lead with Status **New** and Source **Website**, unassigned.
> **Dev:** Can the Sales Rep who spots it just take it?
> **Expert:** No — only a **Manager** or **Admin** performs **Assignment**. The Rep works only Leads assigned to them.
> **Dev:** The Rep clicks Contact via WhatsApp and sends the Introduction **Message Template**. Is the message delivery tracked?
> **Expert:** No — we record a **WhatsApp Contact** Activity at click time. It logs intent to contact, not delivery.
> **Dev:** The prospect signs the same day. Can the Rep jump the Lead from New to Won?
> **Expert:** No. The **Transition rule** forces one step forward at a time — New → Contacted → Qualified → Proposal → Won. Lost is the only shortcut, and it's terminal.

## Flagged ambiguities

- (none yet)
