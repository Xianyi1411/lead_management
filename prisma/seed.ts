// Demo seed (Blueprint §13): 1 Admin, 1 Manager, 2 Sales Reps, ~40 leads spread
// across the past 12 months so a demo audience sees a populated year of history —
// monthly Won/Lost outcomes, sales cycle averages, pipeline forecast, and the
// Needs-attention queue all draw from real data instead of blank months.
//
// The last 16 leads (most recent ~9 weeks) anchor the current-month demo:
// overdue follow-ups, due-today, idle leads, the hottest lead, and a
// pipeline forecast that populates the next three months. The other ~24
// leads are historical wins and losses distributed to make the Reports
// screen's velocity and outcomes charts read as a real business.
//
// Run with:  npm run db:seed   (or  npm run db:reset  to wipe + reseed)

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TEMPLATES, ALL_ROLES_CSV } from "../lib/whatsapp";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";
const DAY = 86_400_000;

// Display name for the CREATED activity's "· source X" suffix. Custom source
// names (e.g. "Google Ads") pass through unchanged.
const SOURCE_LABEL: Record<string, string> = {
  WEBSITE: "Website",
  REFERRAL: "Referral",
  WALK_IN: "Walk-in",
  SOCIAL_MEDIA: "Social media",
  EVENT: "Event",
  OTHER: "Other",
};
const srcLabel = (code: string): string => SOURCE_LABEL[code] ?? code;

// A rep record — id + first name for the "Assigned to X" activity detail.
interface Rep {
  id: string;
  first: string;
}

type ActivityInput = {
  type: string;
  detail: string;
  by: { id: string };
  afterDays?: number;
};

// A completed win: created → assigned → contacted → qualified → proposal → won.
// The four `gaps` are the day-count between each transition, so the whole cycle
// length equals their sum plus the 0.3-day assignment gap.
function wonChain(
  source: string,
  rep: Rep,
  manager: Rep,
  gaps: [number, number, number, number]
): ActivityInput[] {
  const [toContact, toQualify, toProposal, toWon] = gaps;
  return [
    { type: "CREATED", detail: `Lead created · source ${srcLabel(source)}`, by: manager, afterDays: 0 },
    { type: "ASSIGNMENT", detail: `Assigned to ${rep.first}`, by: manager, afterDays: 0.3 },
    { type: "STATUS_CHANGE", detail: "New → Contacted", by: rep, afterDays: toContact },
    { type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: rep, afterDays: toQualify },
    { type: "STATUS_CHANGE", detail: "Qualified → Proposal", by: rep, afterDays: toProposal },
    { type: "STATUS_CHANGE", detail: "Proposal → Won", by: rep, afterDays: toWon },
  ];
}

// A lost lead — falls out of the funnel at `from` with a documented `reasonText`.
function lostChain(
  source: string,
  rep: Rep,
  manager: Rep,
  from: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL",
  reasonText: string,
  gaps: { toContact?: number; toQualify?: number; toProposal?: number; toLost: number }
): ActivityInput[] {
  const acts: ActivityInput[] = [
    { type: "CREATED", detail: `Lead created · source ${srcLabel(source)}`, by: manager, afterDays: 0 },
    { type: "ASSIGNMENT", detail: `Assigned to ${rep.first}`, by: manager, afterDays: 0.3 },
  ];
  if (from === "NEW") {
    acts.push({ type: "STATUS_CHANGE", detail: `New → Lost · ${reasonText}`, by: rep, afterDays: gaps.toLost });
    return acts;
  }
  acts.push({ type: "STATUS_CHANGE", detail: "New → Contacted", by: rep, afterDays: gaps.toContact ?? 1 });
  if (from === "CONTACTED") {
    acts.push({ type: "STATUS_CHANGE", detail: `Contacted → Lost · ${reasonText}`, by: rep, afterDays: gaps.toLost });
    return acts;
  }
  acts.push({ type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: rep, afterDays: gaps.toQualify ?? 3 });
  if (from === "QUALIFIED") {
    acts.push({ type: "STATUS_CHANGE", detail: `Qualified → Lost · ${reasonText}`, by: rep, afterDays: gaps.toLost });
    return acts;
  }
  acts.push({ type: "STATUS_CHANGE", detail: "Qualified → Proposal", by: rep, afterDays: gaps.toProposal ?? 4 });
  acts.push({ type: "STATUS_CHANGE", detail: `Proposal → Lost · ${reasonText}`, by: rep, afterDays: gaps.toLost });
  return acts;
}

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
    { label: "Meeting request", roles: ALL_ROLES_CSV,
      body: "Hi {leadName}, {repName} here. Could we set up a quick 20-minute call this week to understand {company}'s needs better? Just let me know a time that suits you." },
    { label: "Quotation sent", roles: ALL_ROLES_CSV,
      body: "Hi {leadName}, I've just emailed the quotation for {company}. Happy to walk you through the numbers here on WhatsApp or on a quick call — whichever you prefer." },
    { label: "Demo invitation", roles: ALL_ROLES_CSV,
      body: "Hi {leadName}, would your team at {company} like a short live demo? 30 minutes, no obligation — I'll tailor it to what you told me. When works for you?" },
    { label: "Reconnect", roles: ALL_ROLES_CSV,
      body: "Hi {leadName}, it's {repName} — it's been a while since we last spoke about {company}'s plans. Has anything changed on your side? Happy to pick things up whenever you're ready." },
    { label: "Event invitation", roles: ALL_ROLES_CSV,
      body: "Hi {leadName}, we're hosting a short product showcase next week and I'd love to have {company} there. Shall I reserve two seats for your team?" },
    { label: "Thank you — welcome aboard", roles: ALL_ROLES_CSV,
      body: "Thank you {leadName}! We're excited to welcome {company} on board. I'll send the onboarding details shortly — and if you need anything at all, just message me here." },
    { label: "Renewal check-in", roles: ALL_ROLES_CSV,
      body: "Hi {leadName}, {repName} here — {company}'s current arrangement with us is coming up for renewal soon. Shall I prepare updated pricing so you can review it early?" },
    { label: "Referral ask", roles: ALL_ROLES_CSV,
      body: "Hi {leadName}, so glad things are going well with {company}! If you know anyone else who could use our help, I'd really appreciate an introduction — happy to return the favour." },
    { label: "Price discussion", roles: MGMT,
      body: "Hi {leadName}, I understand budget is a real consideration for {company}. I've spoken with management and we have some flexibility — can we go through the numbers together tomorrow?" },
    { label: "Discount approval", roles: MGMT,
      body: "Hi {leadName}, good news — I've approved a special rate for {company}. I'd love to close this together: when are you free today?" },
    { label: "Payment reminder", roles: MGMT,
      body: "Hi {leadName}, a gentle reminder that the invoice for {company} is due this week. Do let me know if payment is already on the way — thank you!" },
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

  // Reps for the chain helpers (id + first name for "Assigned to X").
  const HT: Rep = { id: huiting.id, first: "Hui Ting" };
  const FA: Rep = { id: farid.id, first: "Farid" };
  const MG: Rep = { id: manager.id, first: "Hafiz" };
  const AD: Rep = { id: admin.id, first: "Aina" };

  type Seed = {
    name: string;
    phone: string;
    email?: string;
    company: string;
    source: string;
    status: string;
    dealValue: number;
    assignedTo?: { id: string; name: string } | null;
    budgetStatus?: string;
    authority?: string;
    timeline?: string;
    budgetAmount?: number;
    expectedCloseInDays?: number;
    followUpInDays?: number;
    lostReason?: string;
    createdDaysAgo: number;
    activities: ActivityInput[];
  };

  const leads: Seed[] = [
    // =====================================================================
    // CURRENT MONTH · Active leads for the "today" demo (needs-attention,
    // hottest leads, pipeline forecast). Kept from the previous seed.
    // =====================================================================
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
      budgetAmount: 100000, expectedCloseInDays: 9,
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
      name: "Ahmad Faizal", phone: "+60 13-448 2290", email: "faizal@sunway.com.my",
      company: "Sunway Group", source: "SOCIAL_MEDIA", status: "PROPOSAL", dealValue: 64500,
      assignedTo: farid,
      budgetStatus: "LIKELY", authority: "INFLUENCER", timeline: "THIS_QUARTER",
      budgetAmount: 25000, expectedCloseInDays: 75, // budget under half deal — risk
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
      budgetAmount: 60000, expectedCloseInDays: 30,
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
      createdDaysAgo: 8, // idle NEW lead — attention queue
      activities: [{ type: "CREATED", detail: "Lead created · source Walk-in", by: huiting, afterDays: 0 }],
    },
    {
      name: "Zulkifli Hassan", phone: "+60 13-220 9934", email: "zul@misc.com.my",
      company: "MISC Berhad", source: "OTHER", status: "CONTACTED", dealValue: 78000,
      assignedTo: huiting,
      budgetStatus: "LIKELY", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      followUpInDays: 2,
      createdDaysAgo: 16,
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

    // =====================================================================
    // JUNE 2026 (~13–43 days ago) · Closing wins/losses for the outcomes chart
    // =====================================================================
    {
      name: "David Lim", phone: "+60 12-901 5567", email: "david.lim@airasia.com",
      company: "AirAsia", source: "REFERRAL", status: "WON", dealValue: 120000,
      assignedTo: huiting,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "IMMEDIATE",
      budgetAmount: 130000,
      createdDaysAgo: 40,
      activities: wonChain("REFERRAL", HT, AD, [1, 4, 5, 7]),
    },
    {
      name: "Tan Sri Goh", phone: "+60 12-118 4455", email: "goh@ytl.com",
      company: "YTL Corporation", source: "REFERRAL", status: "WON", dealValue: 150000,
      assignedTo: huiting,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      budgetAmount: 175000,
      createdDaysAgo: 35,
      activities: wonChain("REFERRAL", HT, AD, [1, 6, 5, 9]),
    },
    {
      name: "Marcus Teoh", phone: "+60 12-667 3341", email: "marcus@penanglogistics.my",
      company: "Penang Logistics", source: "EVENT", status: "WON", dealValue: 70000,
      assignedTo: farid,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "IMMEDIATE",
      budgetAmount: 75000,
      createdDaysAgo: 28,
      activities: wonChain("EVENT", FA, MG, [1, 3, 4, 6]),
    },
    {
      name: "Kok Wai Lee", phone: "+60 12-556 7781", email: "kokwai@publicbank.com.my",
      company: "Public Bank", source: "EVENT", status: "LOST", dealValue: 40000,
      assignedTo: huiting,
      budgetStatus: "LIKELY", authority: "INFLUENCER", timeline: "THIS_YEAR",
      lostReason: "PRICE",
      createdDaysAgo: 32,
      activities: lostChain("EVENT", HT, MG, "CONTACTED", "Price too high", { toContact: 2, toLost: 8 }),
    },
    {
      name: "Halim Bakri", phone: "+60 13-902 1103", email: "halim@kuantanmarine.my",
      company: "Kuantan Marine Services", source: "OTHER", status: "LOST", dealValue: 55000,
      assignedTo: farid,
      budgetStatus: "LIKELY", authority: "INFLUENCER", timeline: "THIS_QUARTER",
      lostReason: "COMPETITOR",
      createdDaysAgo: 42,
      activities: lostChain("OTHER", FA, MG, "PROPOSAL", "Chose a competitor",
        { toContact: 2, toQualify: 5, toProposal: 4, toLost: 3 }),
    },
    {
      name: "Kenneth Ho", phone: "+60 12-449 3382", email: "kenneth@selangortech.my",
      company: "Selangor Tech Group", source: "WEBSITE", status: "LOST", dealValue: 30000,
      assignedTo: huiting,
      budgetStatus: "UNKNOWN", authority: "INFLUENCER", timeline: "THIS_YEAR",
      lostReason: "NOT_INTERESTED",
      createdDaysAgo: 38,
      activities: lostChain("WEBSITE", HT, MG, "CONTACTED", "Not interested", { toContact: 3, toLost: 8 }),
    },

    // =====================================================================
    // MAY 2026 (~43–74 days ago) — strong wins month
    // =====================================================================
    {
      name: "Muthu Kumar", phone: "+60 16-772 0021", email: "muthu@southerndistributors.my",
      company: "Southern Distributors", source: "REFERRAL", status: "WON", dealValue: 115000,
      assignedTo: huiting,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      budgetAmount: 125000,
      createdDaysAgo: 85,
      activities: wonChain("REFERRAL", HT, MG, [2, 8, 6, 11]),
    },
    {
      name: "Rozita Aziz", phone: "+60 13-556 4491", email: "rozita@bumiadvisory.my",
      company: "Bumi Advisory", source: "EVENT", status: "WON", dealValue: 92000,
      assignedTo: farid,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "IMMEDIATE",
      budgetAmount: 100000,
      createdDaysAgo: 75,
      activities: wonChain("EVENT", FA, MG, [1, 5, 6, 8]),
    },
    {
      name: "Terry Chin", phone: "+60 17-882 5109", email: "terry@northerntech.my",
      company: "Northern Tech Consulting", source: "SOCIAL_MEDIA", status: "WON", dealValue: 45000,
      assignedTo: huiting,
      budgetStatus: "LIKELY", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      budgetAmount: 50000,
      createdDaysAgo: 72,
      activities: wonChain("SOCIAL_MEDIA", HT, MG, [2, 6, 5, 9]),
    },
    {
      name: "Michelle Lee", phone: "+60 12-887 4415", email: "michelle@puchongretail.my",
      company: "Puchong Retail Ventures", source: "SOCIAL_MEDIA", status: "LOST", dealValue: 24000,
      assignedTo: farid,
      budgetStatus: "NONE", authority: "INFLUENCER", timeline: "THIS_YEAR",
      lostReason: "PRICE",
      createdDaysAgo: 73,
      activities: lostChain("SOCIAL_MEDIA", FA, MG, "QUALIFIED", "Price too high",
        { toContact: 2, toQualify: 4, toLost: 2 }),
    },

    // =====================================================================
    // APRIL 2026 (~74–104 days ago)
    // =====================================================================
    {
      name: "Nurhayati Zainal", phone: "+60 13-227 5580", email: "nurhayati@cyberjayadigital.my",
      company: "Cyberjaya Digital Solutions", source: "EVENT", status: "WON", dealValue: 78000,
      assignedTo: huiting,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "IMMEDIATE",
      budgetAmount: 85000,
      createdDaysAgo: 108,
      activities: wonChain("EVENT", HT, MG, [1, 6, 5, 6]),
    },
    {
      name: "Ganesh Krishnan", phone: "+60 16-448 2093", email: "ganesh@iskandarproperty.my",
      company: "Iskandar Property Holdings", source: "REFERRAL", status: "WON", dealValue: 200000,
      assignedTo: farid,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      budgetAmount: 220000,
      createdDaysAgo: 105,
      activities: wonChain("REFERRAL", FA, AD, [2, 7, 8, 8]),
    },
    {
      name: "Lisa Ong", phone: "+60 12-990 3781", email: "lisa@sunshineretail.my",
      company: "Sunshine Retail", source: "WEBSITE", status: "WON", dealValue: 34000,
      assignedTo: huiting,
      budgetStatus: "LIKELY", authority: "DECISION_MAKER", timeline: "IMMEDIATE",
      budgetAmount: 36000,
      createdDaysAgo: 92,
      activities: wonChain("WEBSITE", HT, MG, [1, 4, 4, 5]),
    },
    {
      name: "Sharifah Yasmin", phone: "+60 19-661 4472", email: "yasmin@petalingmedia.my",
      company: "Petaling Media", source: "EVENT", status: "LOST", dealValue: 42000,
      assignedTo: farid,
      budgetStatus: "LIKELY", authority: "INFLUENCER", timeline: "THIS_QUARTER",
      lostReason: "COMPETITOR",
      createdDaysAgo: 104,
      activities: lostChain("EVENT", FA, MG, "PROPOSAL", "Chose a competitor",
        { toContact: 2, toQualify: 4, toProposal: 3, toLost: 3 }),
    },

    // =====================================================================
    // MARCH 2026 (~104–135 days ago)
    // =====================================================================
    {
      name: "Muhammad Hakim", phone: "+60 13-115 2298", email: "hakim@perakmfg.my",
      company: "Perak Manufacturing", source: "WALK_IN", status: "WON", dealValue: 62000,
      assignedTo: huiting,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      budgetAmount: 70000,
      createdDaysAgo: 132,
      activities: wonChain("WALK_IN", HT, MG, [2, 5, 6, 12]),
    },
    {
      name: "Yap Wei Ming", phone: "+60 12-774 5590", email: "yap@sabahpalm.my",
      company: "Sabah Palm Trading", source: "REFERRAL", status: "WON", dealValue: 145000,
      assignedTo: farid,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      budgetAmount: 160000,
      createdDaysAgo: 128,
      activities: wonChain("REFERRAL", FA, MG, [1, 6, 7, 9]),
    },
    {
      name: "Nazrin Kamal", phone: "+60 17-338 6641", email: "nazrin@wilayahauto.my",
      company: "Wilayah Auto", source: "WEBSITE", status: "LOST", dealValue: 33000,
      assignedTo: huiting,
      budgetStatus: "UNKNOWN", authority: "INFLUENCER", timeline: "UNKNOWN",
      lostReason: "NO_RESPONSE",
      createdDaysAgo: 125,
      activities: lostChain("WEBSITE", HT, MG, "CONTACTED", "Went quiet", { toContact: 2, toLost: 6 }),
    },

    // =====================================================================
    // FEBRUARY 2026 (~135–163 days ago)
    // =====================================================================
    {
      name: "Wan Iman Abdullah", phone: "+60 13-889 2210", email: "wan.iman@nusantarafoods.my",
      company: "Nusantara Foods", source: "EVENT", status: "WON", dealValue: 110000,
      assignedTo: huiting,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      budgetAmount: 120000,
      createdDaysAgo: 165,
      activities: wonChain("EVENT", HT, AD, [2, 6, 5, 10]),
    },
    {
      name: "Cheah Boon Lin", phone: "+60 16-771 3345", email: "cheah@pearltextiles.my",
      company: "Pearl Textiles", source: "WEBSITE", status: "WON", dealValue: 26000,
      assignedTo: farid,
      budgetStatus: "LIKELY", authority: "DECISION_MAKER", timeline: "IMMEDIATE",
      budgetAmount: 28000,
      createdDaysAgo: 160,
      activities: wonChain("WEBSITE", FA, MG, [1, 3, 4, 5]),
    },
    {
      name: "Devi Nair", phone: "+60 12-337 6698", email: "devi@klangvalleyclinic.my",
      company: "Klang Valley Clinic Group", source: "REFERRAL", status: "WON", dealValue: 88000,
      assignedTo: huiting,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      budgetAmount: 95000,
      createdDaysAgo: 158,
      activities: wonChain("REFERRAL", HT, MG, [1, 5, 6, 6]),
    },
    {
      name: "Angeline Chan", phone: "+60 17-556 1120", email: "angeline@bangifoods.my",
      company: "Bangi Foods", source: "WALK_IN", status: "LOST", dealValue: 28000,
      assignedTo: farid,
      budgetStatus: "LIKELY", authority: "INFLUENCER", timeline: "THIS_YEAR",
      lostReason: "PRICE",
      createdDaysAgo: 160,
      activities: lostChain("WALK_IN", FA, MG, "QUALIFIED", "Price too high",
        { toContact: 2, toQualify: 4, toLost: 4 }),
    },

    // =====================================================================
    // JANUARY 2026 (~163–194 days ago)
    // =====================================================================
    {
      name: "Ismail Yusof", phone: "+60 13-778 4410", email: "ismail@kelantanrice.my",
      company: "Kelantan Rice Millers Coop", source: "REFERRAL", status: "WON", dealValue: 48000,
      assignedTo: huiting,
      budgetStatus: "LIKELY", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      budgetAmount: 50000,
      createdDaysAgo: 185,
      activities: wonChain("REFERRAL", HT, MG, [2, 6, 5, 7]),
    },
    {
      name: "Ariff Rahman", phone: "+60 12-661 3390", email: "ariff@terengganushipping.my",
      company: "Terengganu Shipping", source: "REFERRAL", status: "LOST", dealValue: 65000,
      assignedTo: farid,
      budgetStatus: "UNKNOWN", authority: "INFLUENCER", timeline: "THIS_YEAR",
      lostReason: "BAD_FIT",
      createdDaysAgo: 180,
      activities: lostChain("REFERRAL", FA, MG, "QUALIFIED", "Bad fit",
        { toContact: 3, toQualify: 5, toLost: 4 }),
    },

    // =====================================================================
    // DECEMBER 2025 (~194–225 days ago)
    // =====================================================================
    {
      name: "Kumaran Rajaratnam", phone: "+60 16-992 8817", email: "kumaran@southernsteel.my",
      company: "Southern Steel", source: "WALK_IN", status: "WON", dealValue: 68000,
      assignedTo: huiting,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      budgetAmount: 75000,
      createdDaysAgo: 210,
      activities: wonChain("WALK_IN", HT, MG, [2, 7, 6, 10]),
    },
    {
      name: "Vera Yong", phone: "+60 12-448 5590", email: "vera@pjfashion.my",
      company: "PJ Fashion Hub", source: "WEBSITE", status: "LOST", dealValue: 15000,
      assignedTo: farid,
      budgetStatus: "NONE", authority: "INFLUENCER", timeline: "UNKNOWN",
      lostReason: "NOT_INTERESTED",
      createdDaysAgo: 218,
      activities: lostChain("WEBSITE", FA, MG, "CONTACTED", "Not interested", { toContact: 3, toLost: 5 }),
    },

    // =====================================================================
    // NOVEMBER 2025 (~225–255 days ago)
    // =====================================================================
    {
      name: "Fatimah Zahra binti Ahmad", phone: "+60 13-227 9946", email: "fatimah@emeraldproperty.my",
      company: "Emerald Property", source: "REFERRAL", status: "WON", dealValue: 175000,
      assignedTo: farid,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      budgetAmount: 200000,
      createdDaysAgo: 225,
      activities: wonChain("REFERRAL", FA, AD, [1, 5, 6, 7]),
    },
    {
      name: "Vincent Yeoh", phone: "+60 17-116 6624", email: "vincent@cybersecsolutions.my",
      company: "Cybersec Solutions", source: "SOCIAL_MEDIA", status: "WON", dealValue: 42000,
      assignedTo: huiting,
      budgetStatus: "LIKELY", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      budgetAmount: 45000,
      createdDaysAgo: 245,
      activities: wonChain("SOCIAL_MEDIA", HT, MG, [2, 5, 5, 8]),
    },

    // =====================================================================
    // OCTOBER 2025 (~255–286 days ago)
    // =====================================================================
    {
      name: "Norlela Ismail", phone: "+60 12-882 3341", email: "norlela@klwellness.my",
      company: "KL Wellness Group", source: "EVENT", status: "WON", dealValue: 55000,
      assignedTo: huiting,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      budgetAmount: 60000,
      createdDaysAgo: 268,
      activities: wonChain("EVENT", HT, MG, [1, 6, 5, 8]),
    },
    {
      name: "Tan Boon Kai", phone: "+60 19-556 3391", email: "tan.bk@puchongauto.my",
      company: "Puchong Auto", source: "OTHER", status: "LOST", dealValue: 38000,
      assignedTo: farid,
      budgetStatus: "LIKELY", authority: "INFLUENCER", timeline: "THIS_YEAR",
      lostReason: "COMPETITOR",
      createdDaysAgo: 273,
      activities: lostChain("OTHER", FA, MG, "PROPOSAL", "Chose a competitor",
        { toContact: 2, toQualify: 5, toProposal: 4, toLost: 4 }),
    },

    // =====================================================================
    // SEPTEMBER 2025 (~286–316 days ago)
    // =====================================================================
    {
      name: "Ong Chin Hooi", phone: "+60 12-773 4429", email: "ong@penangtech.my",
      company: "PenangTech Ventures", source: "REFERRAL", status: "WON", dealValue: 95000,
      assignedTo: farid,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      budgetAmount: 100000,
      createdDaysAgo: 298,
      activities: wonChain("REFERRAL", FA, MG, [1, 5, 6, 9]),
    },
    {
      name: "Rachel Loh", phone: "+60 16-880 4425", email: "rachel@midvalleydigital.my",
      company: "MidValley Digital", source: "SOCIAL_MEDIA", status: "LOST", dealValue: 18000,
      assignedTo: huiting,
      budgetStatus: "UNKNOWN", authority: "INFLUENCER", timeline: "UNKNOWN",
      lostReason: "NO_RESPONSE",
      createdDaysAgo: 300,
      activities: lostChain("SOCIAL_MEDIA", HT, MG, "CONTACTED", "Went quiet", { toContact: 3, toLost: 9 }),
    },

    // =====================================================================
    // AUGUST 2025 (~316–347 days ago)
    // =====================================================================
    {
      name: "Aina Sofia binti Ibrahim", phone: "+60 13-338 2210", email: "aina.sofia@sarawakpalm.my",
      company: "Sarawak Palm Oil", source: "EVENT", status: "WON", dealValue: 220000,
      assignedTo: huiting,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      budgetAmount: 250000,
      createdDaysAgo: 328,
      activities: wonChain("EVENT", HT, AD, [2, 6, 7, 10]),
    },
    {
      name: "Rajesh Menon", phone: "+60 16-449 3358", email: "rajesh@jbmarine.my",
      company: "JB Marine Services", source: "WEBSITE", status: "WON", dealValue: 32000,
      assignedTo: farid,
      budgetStatus: "LIKELY", authority: "DECISION_MAKER", timeline: "IMMEDIATE",
      budgetAmount: 35000,
      createdDaysAgo: 315,
      activities: wonChain("WEBSITE", FA, MG, [1, 4, 4, 6]),
    },

    // =====================================================================
    // JULY 2025 (~347–377 days ago) — the earliest historical closes
    // =====================================================================
    {
      name: "Chen Wei Ming", phone: "+60 12-115 6672", email: "chen@technologix.my",
      company: "TechnoLogix Sdn Bhd", source: "REFERRAL", status: "WON", dealValue: 85000,
      assignedTo: huiting,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      budgetAmount: 90000,
      createdDaysAgo: 358,
      activities: wonChain("REFERRAL", HT, MG, [2, 5, 5, 8]),
    },
    {
      name: "Ahmad Zaki bin Osman", phone: "+60 17-773 2205", email: "ahmad.zaki@eastcoast.my",
      company: "EastCoast Trading", source: "WEBSITE", status: "LOST", dealValue: 22000,
      assignedTo: farid,
      budgetStatus: "NONE", authority: "INFLUENCER", timeline: "UNKNOWN",
      lostReason: "PRICE",
      createdDaysAgo: 348,
      activities: lostChain("WEBSITE", FA, MG, "QUALIFIED", "Price too high",
        { toContact: 3, toQualify: 5, toLost: 4 }),
    },

    // =====================================================================
    // CURRENT-MONTH WINS · Recently closed for the "Jul 2026" bar
    // =====================================================================
    {
      name: "Aisha Binti Omar", phone: "+60 17-455 8890", email: "aisha@selangorretail.my",
      company: "Selangor Retail Group", source: "WALK_IN", status: "LOST", dealValue: 25000,
      assignedTo: huiting,
      budgetStatus: "LIKELY", authority: "DECISION_MAKER", timeline: "THIS_QUARTER",
      lostReason: "COMPETITOR",
      createdDaysAgo: 21,
      activities: lostChain("WALK_IN", HT, MG, "QUALIFIED", "Chose a competitor",
        { toContact: 1, toQualify: 4, toLost: 6 }),
    },
    {
      name: "Adlin Rahim", phone: "+60 13-664 3392", email: "adlin@klangmarine.my",
      company: "Klang Marine Ventures", source: "Google Ads", status: "WON", dealValue: 28000,
      assignedTo: farid,
      budgetStatus: "CONFIRMED", authority: "DECISION_MAKER", timeline: "IMMEDIATE",
      budgetAmount: 30000,
      createdDaysAgo: 22,
      activities: wonChain("Google Ads", FA, MG, [1, 3, 4, 6]),
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

  console.log(`Seeded 4 users and ${created} leads across the last 12 months.`);
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
