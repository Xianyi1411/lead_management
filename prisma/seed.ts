// Demo seed (Blueprint §13): 1 Admin, 1 Manager, 2 Sales Reps, ~12 leads across every
// status and source, each with a small activity timeline. Passwords are shared and
// documented in the README for the demo.
//
// Run with:  npm run db:seed   (or  npm run db:reset  to wipe + reseed)

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Clear existing data (order matters for FKs)
  await prisma.activity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();

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
    activities: { type: string; detail: string; by: { id: string } }[];
  };

  const leads: Seed[] = [
    {
      name: "Nurul Aziz", phone: "+60 12-345 6789", email: "nurul.aziz@petronas.my",
      company: "Petronas SB", source: "REFERRAL", status: "QUALIFIED", dealValue: 48000,
      assignedTo: huiting,
      activities: [
        { type: "CREATED", detail: "Lead created · source Referral", by: manager },
        { type: "ASSIGNMENT", detail: "Assigned to Hui Ting", by: manager },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: huiting },
        { type: "WHATSAPP_CONTACT", detail: "Intro template", by: huiting },
        { type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: huiting },
      ],
    },
    {
      name: "Wei Jie Tan", phone: "+60 16-882 4410", email: "weijie@grab.com",
      company: "Grab Malaysia", source: "WEBSITE", status: "CONTACTED", dealValue: 12500,
      assignedTo: null,
      activities: [
        { type: "CREATED", detail: "Lead created · source Website", by: manager },
        { type: "WHATSAPP_CONTACT", detail: "Intro template", by: farid },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: farid },
      ],
    },
    {
      name: "Siti Rahayu", phone: "+60 19-770 1123", email: "siti@maybank.com",
      company: "Maybank", source: "EVENT", status: "PROPOSAL", dealValue: 90000,
      assignedTo: farid,
      activities: [
        { type: "CREATED", detail: "Lead created · source Event", by: manager },
        { type: "ASSIGNMENT", detail: "Assigned to Farid", by: manager },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: farid },
        { type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: farid },
        { type: "STATUS_CHANGE", detail: "Qualified → Proposal", by: farid },
      ],
    },
    {
      name: "David Lim", phone: "+60 12-901 5567", email: "david.lim@airasia.com",
      company: "AirAsia", source: "REFERRAL", status: "WON", dealValue: 120000,
      assignedTo: huiting,
      activities: [
        { type: "CREATED", detail: "Lead created · source Referral", by: admin },
        { type: "ASSIGNMENT", detail: "Assigned to Hui Ting", by: manager },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: huiting },
        { type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: huiting },
        { type: "STATUS_CHANGE", detail: "Qualified → Proposal", by: huiting },
        { type: "STATUS_CHANGE", detail: "Proposal → Won", by: huiting },
      ],
    },
    {
      name: "Ahmad Faizal", phone: "+60 13-448 2290", email: "faizal@sunway.com.my",
      company: "Sunway Group", source: "SOCIAL_MEDIA", status: "PROPOSAL", dealValue: 64500,
      assignedTo: farid,
      activities: [
        { type: "CREATED", detail: "Lead created · source Social media", by: manager },
        { type: "ASSIGNMENT", detail: "Assigned to Farid", by: manager },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: farid },
        { type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: farid },
        { type: "STATUS_CHANGE", detail: "Qualified → Proposal", by: farid },
      ],
    },
    {
      name: "Mei Ling Chong", phone: "+60 17-330 8842", email: "meiling@topglove.com",
      company: "Top Glove", source: "WEBSITE", status: "NEW", dealValue: 30000,
      assignedTo: null,
      activities: [{ type: "CREATED", detail: "Lead created · source Website", by: manager }],
    },
    {
      name: "Ravi Kumar", phone: "+60 11-2984 6610", email: "ravi@axiata.com",
      company: "Axiata", source: "REFERRAL", status: "QUALIFIED", dealValue: 55000,
      assignedTo: farid,
      activities: [
        { type: "CREATED", detail: "Lead created · source Referral", by: manager },
        { type: "ASSIGNMENT", detail: "Assigned to Farid", by: manager },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: farid },
        { type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: farid },
      ],
    },
    {
      name: "Farah Nadia", phone: "+60 18-664 2201", email: "farah@genting.com",
      company: "Genting", source: "WALK_IN", status: "NEW", dealValue: 21000,
      assignedTo: null,
      activities: [{ type: "CREATED", detail: "Lead created · source Walk-in", by: huiting }],
    },
    {
      name: "Kok Wai Lee", phone: "+60 12-556 7781", email: "kokwai@publicbank.com.my",
      company: "Public Bank", source: "EVENT", status: "LOST", dealValue: 40000,
      assignedTo: huiting,
      activities: [
        { type: "CREATED", detail: "Lead created · source Event", by: manager },
        { type: "ASSIGNMENT", detail: "Assigned to Hui Ting", by: manager },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: huiting },
        { type: "STATUS_CHANGE", detail: "Contacted → Lost", by: huiting },
      ],
    },
    {
      name: "Zulkifli Hassan", phone: "+60 13-220 9934", email: "zul@misc.com.my",
      company: "MISC Berhad", source: "OTHER", status: "CONTACTED", dealValue: 78000,
      assignedTo: huiting,
      activities: [
        { type: "CREATED", detail: "Lead created · source Other", by: admin },
        { type: "ASSIGNMENT", detail: "Assigned to Hui Ting", by: manager },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: huiting },
      ],
    },
    {
      name: "Priya Devi", phone: "+60 16-778 3320", email: "priya@ihh.com",
      company: "IHH Healthcare", source: "SOCIAL_MEDIA", status: "QUALIFIED", dealValue: 33000,
      assignedTo: farid,
      activities: [
        { type: "CREATED", detail: "Lead created · source Social media", by: manager },
        { type: "ASSIGNMENT", detail: "Assigned to Farid", by: manager },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: farid },
        { type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: farid },
      ],
    },
    {
      name: "Tan Sri Goh", phone: "+60 12-118 4455", email: "goh@ytl.com",
      company: "YTL Corporation", source: "REFERRAL", status: "WON", dealValue: 150000,
      assignedTo: huiting,
      activities: [
        { type: "CREATED", detail: "Lead created · source Referral", by: admin },
        { type: "ASSIGNMENT", detail: "Assigned to Hui Ting", by: manager },
        { type: "STATUS_CHANGE", detail: "New → Contacted", by: huiting },
        { type: "STATUS_CHANGE", detail: "Contacted → Qualified", by: huiting },
        { type: "STATUS_CHANGE", detail: "Qualified → Proposal", by: huiting },
        { type: "STATUS_CHANGE", detail: "Proposal → Won", by: huiting },
      ],
    },
  ];

  let created = 0;
  for (const l of leads) {
    const lead = await prisma.lead.create({
      data: {
        name: l.name,
        phone: l.phone,
        email: l.email ?? null,
        company: l.company,
        source: l.source,
        status: l.status,
        dealValue: l.dealValue,
        assignedToId: l.assignedTo ? l.assignedTo.id : null,
        createdById: manager.id,
      },
    });

    // Space activities out so timelines read chronologically.
    let t = Date.now() - l.activities.length * 3_600_000;
    for (const a of l.activities) {
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: a.by.id,
          type: a.type,
          detail: a.detail,
          createdAt: new Date(t),
        },
      });
      t += 3_600_000;
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
