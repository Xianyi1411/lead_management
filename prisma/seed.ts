// Demo seed (Blueprint §13): 1 Admin, 1 Manager, 2 Sales Reps, ~15 leads across every
// status and source, each with a small activity timeline. Passwords are shared and
// documented in the README for the demo.
//
// Timelines are spread over the past ~10 weeks with day-scale gaps so the velocity
// analytics (time-in-stage, conversion, sales cycle) and the monthly trend read as
// real history, not zeros. Qualification facts, follow-ups, and lost reasons are
// seeded so the fit scores, attention queue, and reports land populated.
//
// Run with:  npm run db:seed   (or  npm run db:reset  to wipe + reseed)

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TEMPLATES, ALL_ROLES_CSV } from "../lib/whatsapp";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";
const DAY = 86_400_000;

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Clear existing data (order matters for FKs)
  await prisma.activity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.customSource.deleteMany();
  await prisma.messageTemplate.deleteMany();

  // One team-added source so the extensible-source flow demos populated
  await prisma.customSource.create({ data: { name: "Google Ads" } });

  // WhatsApp templates (Blueprint §14.9): the three tested built-ins plus a
  // realistic library covering the whole lead lifecycle. A few are
  // management-only so the role gate demos visibly — a Rep sees fewer chips
  // than a Manager on the same lead.
  const MGMT = "ADMIN,MANAGER";
  const demoTemplates: { label: string; body: string; roles: string }[] = [
    ...Object.values(TEMPLATES).map((t) => ({ label: t.label, body: t.body, roles: ALL_ROLES_CSV })),
    {
      label: "Meeting request",
      body:
        "Hi {leadName}, {repName} here. Could we set up a quick 20-minute call this week to understand {company}'s needs better? Just let me know a time that suits you.",
      roles: ALL_ROLES_CSV,
    },
    {
      label: "Quotation sent",
      body:
        "Hi {leadName}, I've just emailed the quotation for {company}. Happy to walk you through the numbers here on WhatsApp or on a quick call — whichever you prefer.",
      roles: ALL_ROLES_CSV,
    },
    {
      label: "Demo invitation",
      body:
        "Hi {leadName}, would your team at {company} like a short live demo? 30 minutes, no obligation — I'll tailor it to what you told me. When works for you?",
      roles: ALL_ROLES_CSV,
    },
    {
      label: "Reconnect",
      body:
        "Hi {leadName}, it's {repName} — it's been a while since we last spoke about {company}'s plans. Has anything changed on your side? Happy to pick things up whenever you're ready.",
      roles: ALL_ROLES_CSV,
    },
    {
      label: "Event invitation",
      body:
        "Hi {leadName}, we're hosting a short product showcase next week and I'd love to have {company} there. Shall I reserve two seats for your team?",
      roles: ALL_ROLES_CSV,
    },
    {
      label: "Thank you — welcome aboard",
      body:
        "Thank you {leadName}! We're excited to welcome {company} on board. I'll send the onboarding details shortly — and if you need anything at all, just message me here.",
      roles: ALL_ROLES_CSV,
    },
    {
      label: "Renewal check-in",
      body:
        "Hi {leadName}, {repName} here — {company}'s current arrangement with us is coming up for renewal soon. Shall I prepare updated pricing so you can review it early?",
      roles: ALL_ROLES_CSV,
    },
    {
      label: "Referral ask",
      body:
        "Hi {leadName}, so glad things are going well with {company}! If you know anyone else who could use our help, I'd really appreciate an introduction — happy to return the favour.",
      roles: ALL_ROLES_CSV,
    },
    {
      label: "Price discussion",
      body:
        "Hi {leadName}, I understand budget is a real consideration for {company}. I've spoken with management and we have some flexibility — can we go through the numbers together tomorrow?",
      roles: MGMT,
    },
    {
      label: "Discount approval",
      body:
        "Hi {leadName}, good news — I've approved a special rate for {company}. I'd love to close this together: when are you free today?",
      roles: MGMT,
    },
    {
      label: "Payment reminder",
      body:
        "Hi {leadName}, a gentle reminder that the invoice for {company} is due this week. Do let me know if payment is already on the way — thank you!",
      roles: MGMT,
    },
  ];
  for (const t of demoTemplates) {
    await prisma.messageTemplate.create({ data: t });
  }

  const admin = await prisma.user.create({
    data: { name: "Aina Zahra", email: "aina@company.my", passwordHash, role: "ADMIN" },
  });
  const manager = await prisma.user.create({
    data: { name: "Hafiz Rahman", email: "hafiz@company.my", passwordHash, role: "MANAGER" },
  });
  const huiting = await prisma.user.create({
    data: { name: "Hui Ting", email: "huiting@company.my", passwordHash, role: "SALES_REP" },
  });
  const farid = await prisma.user.create({
    data: { name: "Farid Osman", email: "farid@company.my", passwordHash, role: "SALES_REP" },
  });

  type Seed = {
    name: string;
    phone: string;
    email?: string;
    company: string;
    source: string;
    status: string;
    dealValue: number;
    assignedTo?: { id: string; name: string } | null;
    /** qualification facts (default UNKNOWN when omitted) */
    budgetStatus?: string;
    authority?: string;
    timeline?: string;
    /** exact figures behind the bands (§14.8) */
    budgetAmount?: number;
    expectedCloseInDays?: number;
    /** days from now (negative = overdue, 0 = today) */
    followUpInDays?: number;
    lostReason?: string;
    /** lead created this many days ago */
    createdDaysAgo: number;
    /** each activity happens this many days after the previous one (first = after creation) */
    activities: { type: string; detail: string; by: { id: string }; afterDays?: number }[];
  };

  const leads: Seed[] = [
    {
      name: "Nurul Aziz", phone: "+60 12-345 6789", email: "nurul.aziz@petronas.my",
      company: "Petronas SB", source: "REFERRAL", status: "QUALIFIED", dealValue: 48000,
      assignedTo: huiting,
      budgetStatus: "LIKELY", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      budgetAmount: 50000, expectedCloseInDays: 45,
      followUpInDays: 1,
      createdDaysAgo: 14,
      activities: [
        { type: "CREATED", detail: "Lead created · source Referral", by: manager, afterDays: 0 },
        { type: "ASSIGNMENT", detail: "Assigned to Hui Ting", by: manager, afterDays: 0.2 },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: huiting, afterDays: 1 },
        { type: "WHATSAPP_CONTACT", detail: "Intro template", by: huiting, afterDays: 0.1 },
        { type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: huiting, afterDays: 4 },
      ],
    },
    {
      name: "Wei Jie Tan", phone: "+60 16-882 4410", email: "weijie@grab.com",
      company: "Grab Malaysia", source: "WEBSITE", status: "CONTACTED", dealValue: 12500,
      assignedTo: null,
      budgetStatus: "UNKNOWN", authority: "INFLUENCER", timeline: "THIS_YEAR",
      createdDaysAgo: 9,
      activities: [
        { type: "CREATED", detail: "Lead created · source Website", by: manager, afterDays: 0 },
        { type: "WHATSAPP_CONTACT", detail: "Intro template", by: farid, afterDays: 1 },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: farid, afterDays: 0.1 },
      ],
    },
    {
      name: "Siti Rahayu", phone: "+60 19-770 1123", email: "siti@maybank.com",
      company: "Maybank", source: "EVENT", status: "PROPOSAL", dealValue: 90000,
      assignedTo: farid,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "IMMEDIATE",
      budgetAmount: 100000, expectedCloseInDays: 9, // covers the deal, closing this month
      followUpInDays: -2, // overdue — the demo's "needs attention" star
      createdDaysAgo: 24,
      activities: [
        { type: "CREATED", detail: "Lead created · source Event", by: manager, afterDays: 0 },
        { type: "ASSIGNMENT", detail: "Assigned to Farid", by: manager, afterDays: 0.3 },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: farid, afterDays: 1 },
        { type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: farid, afterDays: 5 },
        { type: "STATUS_CHANGE", detail: "Qualified → Proposal", by: farid, afterDays: 6 },
      ],
    },
    {
      name: "David Lim", phone: "+60 12-901 5567", email: "david.lim@airasia.com",
      company: "AirAsia", source: "REFERRAL", status: "WON", dealValue: 120000,
      assignedTo: huiting,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "IMMEDIATE",
      createdDaysAgo: 63,
      activities: [
        { type: "CREATED", detail: "Lead created · source Referral", by: admin, afterDays: 0 },
        { type: "ASSIGNMENT", detail: "Assigned to Hui Ting", by: manager, afterDays: 0.5 },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: huiting, afterDays: 1 },
        { type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: huiting, afterDays: 4 },
        { type: "STATUS_CHANGE", detail: "Qualified → Proposal", by: huiting, afterDays: 5 },
        { type: "STATUS_CHANGE", detail: "Proposal → Won", by: huiting, afterDays: 7 },
      ],
    },
    {
      name: "Ahmad Faizal", phone: "+60 13-448 2290", email: "faizal@sunway.com.my",
      company: "Sunway Group", source: "SOCIAL_MEDIA", status: "PROPOSAL", dealValue: 64500,
      assignedTo: farid,
      budgetStatus: "LIKELY", authority: "INFLUENCER", timeline: "THIS_QUARTER",
      budgetAmount: 25000, expectedCloseInDays: 75, // stated budget under half the deal — risk
      followUpInDays: 3,
      createdDaysAgo: 30,
      activities: [
        { type: "CREATED", detail: "Lead created · source Social media", by: manager, afterDays: 0 },
        { type: "ASSIGNMENT", detail: "Assigned to Farid", by: manager, afterDays: 1 },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: farid, afterDays: 2 },
        { type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: farid, afterDays: 6 },
        { type: "STATUS_CHANGE", detail: "Qualified → Proposal", by: farid, afterDays: 9 },
      ],
    },
    {
      name: "Mei Ling Chong", phone: "+60 17-330 8842", email: "meiling@topglove.com",
      company: "Top Glove", source: "WEBSITE", status: "NEW", dealValue: 30000,
      assignedTo: null,
      budgetStatus: "UNKNOWN", authority: "UNKNOWN", timeline: "THIS_QUARTER",
      createdDaysAgo: 2,
      activities: [{ type: "CREATED", detail: "Lead created · source Website", by: manager, afterDays: 0 }],
    },
    {
      name: "Ravi Kumar", phone: "+60 11-2984 6610", email: "ravi@axiata.com",
      company: "Axiata", source: "REFERRAL", status: "QUALIFIED", dealValue: 55000,
      assignedTo: farid,
      budgetStatus: "CONFIRMED", authority: "INFLUENCER", timeline: "THIS_QUARTER",
      followUpInDays: 0, // due today
      createdDaysAgo: 12,
      activities: [
        { type: "CREATED", detail: "Lead created · source Referral", by: manager, afterDays: 0 },
        { type: "ASSIGNMENT", detail: "Assigned to Farid", by: manager, afterDays: 0.4 },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: farid, afterDays: 1 },
        { type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: farid, afterDays: 5 },
      ],
    },
    {
      name: "Farah Nadia", phone: "+60 18-664 2201", email: "farah@genting.com",
      company: "Genting", source: "WALK_IN", status: "NEW", dealValue: 21000,
      assignedTo: null,
      budgetStatus: "UNKNOWN", authority: "DECISION_MAKER", timeline: "UNKNOWN",
      createdDaysAgo: 8, // idle NEW lead — shows up in the attention queue
      activities: [{ type: "CREATED", detail: "Lead created · source Walk-in", by: huiting, afterDays: 0 }],
    },
    {
      name: "Kok Wai Lee", phone: "+60 12-556 7781", email: "kokwai@publicbank.com.my",
      company: "Public Bank", source: "EVENT", status: "LOST", dealValue: 40000,
      assignedTo: huiting,
      budgetStatus: "LIKELY", authority: "INFLUENCER", timeline: "THIS_YEAR",
      lostReason: "PRICE",
      createdDaysAgo: 38,
      activities: [
        { type: "CREATED", detail: "Lead created · source Event", by: manager, afterDays: 0 },
        { type: "ASSIGNMENT", detail: "Assigned to Hui Ting", by: manager, afterDays: 0.5 },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: huiting, afterDays: 2 },
        { type: "STATUS_CHANGE", detail: "Contacted → Lost · Price too high", by: huiting, afterDays: 8 },
      ],
    },
    {
      name: "Zulkifli Hassan", phone: "+60 13-220 9934", email: "zul@misc.com.my",
      company: "MISC Berhad", source: "OTHER", status: "CONTACTED", dealValue: 78000,
      assignedTo: huiting,
      budgetStatus: "LIKELY", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      followUpInDays: 2,
      createdDaysAgo: 16, // contacted 12 days ago, quiet since — idle
      activities: [
        { type: "CREATED", detail: "Lead created · source Other", by: admin, afterDays: 0 },
        { type: "ASSIGNMENT", detail: "Assigned to Hui Ting", by: manager, afterDays: 1 },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: huiting, afterDays: 3 },
      ],
    },
    {
      name: "Priya Devi", phone: "+60 16-778 3320", email: "priya@ihh.com",
      company: "IHH Healthcare", source: "SOCIAL_MEDIA", status: "QUALIFIED", dealValue: 33000,
      assignedTo: farid,
      budgetStatus: "UNKNOWN", authority: "INFLUENCER", timeline: "THIS_YEAR",
      createdDaysAgo: 19,
      activities: [
        { type: "CREATED", detail: "Lead created · source Social media", by: manager, afterDays: 0 },
        { type: "ASSIGNMENT", detail: "Assigned to Farid", by: manager, afterDays: 0.5 },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: farid, afterDays: 2 },
        { type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: farid, afterDays: 7 },
      ],
    },
    {
      name: "Tan Sri Goh", phone: "+60 12-118 4455", email: "goh@ytl.com",
      company: "YTL Corporation", source: "REFERRAL", status: "WON", dealValue: 150000,
      assignedTo: huiting,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      createdDaysAgo: 40,
      activities: [
        { type: "CREATED", detail: "Lead created · source Referral", by: admin, afterDays: 0 },
        { type: "ASSIGNMENT", detail: "Assigned to Hui Ting", by: manager, afterDays: 0.3 },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: huiting, afterDays: 1 },
        { type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: huiting, afterDays: 6 },
        { type: "STATUS_CHANGE", detail: "Qualified → Proposal", by: huiting, afterDays: 5 },
        { type: "STATUS_CHANGE", detail: "Proposal → Won", by: huiting, afterDays: 9 },
      ],
    },
    {
      name: "Jason Wong", phone: "+60 14-902 7712", email: "jason@ecommedge.my",
      company: "EcommEdge", source: "WEBSITE", status: "LOST", dealValue: 15000,
      assignedTo: farid,
      budgetStatus: "UNKNOWN", authority: "INFLUENCER", timeline: "UNKNOWN",
      lostReason: "NO_RESPONSE",
      createdDaysAgo: 45,
      activities: [
        { type: "CREATED", detail: "Lead created · source Website", by: manager, afterDays: 0 },
        { type: "ASSIGNMENT", detail: "Assigned to Farid", by: manager, afterDays: 1 },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: farid, afterDays: 2 },
        { type: "WHATSAPP_CONTACT", detail: "Follow-up template", by: farid, afterDays: 4 },
        { type: "STATUS_CHANGE", detail: "Contacted → Lost · Went quiet", by: farid, afterDays: 10 },
      ],
    },
    {
      name: "Aisha Binti Omar", phone: "+60 17-455 8890", email: "aisha@selangorretail.my",
      company: "Selangor Retail Group", source: "WALK_IN", status: "LOST", dealValue: 25000,
      assignedTo: huiting,
      budgetStatus: "LIKELY", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      lostReason: "COMPETITOR",
      createdDaysAgo: 21,
      activities: [
        { type: "CREATED", detail: "Lead created · source Walk-in", by: huiting, afterDays: 0 },
        { type: "ASSIGNMENT", detail: "Assigned to Hui Ting", by: manager, afterDays: 0.5 },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: huiting, afterDays: 1 },
        { type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: huiting, afterDays: 4 },
        { type: "STATUS_CHANGE", detail: "Qualified → Lost · Chose a competitor", by: huiting, afterDays: 6 },
      ],
    },
    {
      name: "Lim Xin Yi", phone: "+60 16-334 5521", email: "xinyi@klangparts.my",
      company: "Klang Auto Parts", source: "Google Ads", status: "CONTACTED", dealValue: 18000,
      assignedTo: farid,
      budgetStatus: "LIKELY", authority: "DECISION_MAKER", timeline: "IMMEDIATE",
      budgetAmount: 20000, expectedCloseInDays: 20,
      followUpInDays: 4,
      createdDaysAgo: 5,
      activities: [
        { type: "CREATED", detail: "Lead created · source Google Ads", by: manager, afterDays: 0 },
        { type: "ASSIGNMENT", detail: "Assigned to Farid", by: manager, afterDays: 0.3 },
        { type: "WHATSAPP_CONTACT", detail: "Intro template", by: farid, afterDays: 1 },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: farid, afterDays: 0.1 },
      ],
    },
    {
      name: "Marcus Teoh", phone: "+60 12-667 3341", email: "marcus@penanglogistics.my",
      company: "Penang Logistics", source: "EVENT", status: "WON", dealValue: 70000,
      assignedTo: farid,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "IMMEDIATE",
      createdDaysAgo: 33,
      activities: [
        { type: "CREATED", detail: "Lead created · source Event", by: manager, afterDays: 0 },
        { type: "ASSIGNMENT", detail: "Assigned to Farid", by: manager, afterDays: 0.2 },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: farid, afterDays: 1 },
        { type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: farid, afterDays: 3 },
        { type: "STATUS_CHANGE", detail: "Qualified → Proposal", by: farid, afterDays: 4 },
        { type: "STATUS_CHANGE", detail: "Proposal → Won", by: farid, afterDays: 6 },
      ],
    },
  ];

  const now = Date.now();
  let created = 0;
  for (const l of leads) {
    const createdAt = new Date(now - l.createdDaysAgo * DAY);
    const followUp =
      l.followUpInDays === undefined ? null : new Date(now + l.followUpInDays * DAY);

    const lead = await prisma.lead.create({
      data: {
        name: l.name,
        phone: l.phone,
        email: l.email ?? null,
        company: l.company,
        source: l.source,
        status: l.status,
        dealValue: l.dealValue,
        budgetStatus: l.budgetStatus ?? "UNKNOWN",
        authority: l.authority ?? "UNKNOWN",
        timeline: l.timeline ?? "UNKNOWN",
        budgetAmount: l.budgetAmount ?? null,
        expectedCloseAt:
          l.expectedCloseInDays === undefined ? null : new Date(now + l.expectedCloseInDays * DAY),
        nextFollowUpAt: followUp,
        lostReason: l.lostReason ?? null,
        assignedToId: l.assignedTo ? l.assignedTo.id : null,
        createdById: manager.id,
        createdAt,
      },
    });

    // Walk the timeline forward from creation using per-activity day gaps.
    let t = createdAt.getTime();
    for (const a of l.activities) {
      t += (a.afterDays ?? 1) * DAY;
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: a.by.id,
          type: a.type,
          detail: a.detail,
          createdAt: new Date(Math.min(t, now - 60_000)), // never in the future
        },
      });
    }
    created++;
  }

  console.log(`Seeded 4 users and ${created} leads with activity timelines.`);
  console.log(`Demo login — password for everyone: ${DEMO_PASSWORD}`);
  console.log("  Admin:   aina@company.my");
  console.log("  Manager: hafiz@company.my");
  console.log("  Rep:     huiting@company.my / farid@company.my");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
