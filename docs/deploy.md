# Deploying to Vercel + Neon (ADR-0001)

Production runs Next.js on **Vercel** with **Neon** PostgreSQL. Local dev/demo keeps
the file-based SQLite database — that's the offline fallback if conference Wi-Fi
fails (Blueprint §9), so nothing below touches your local setup.

**How the two databases coexist:** two Prisma schemas with identical models —
`prisma/schema.prisma` (SQLite, dev) and `prisma/schema.postgres.prisma` (Postgres,
prod). Vercel's build runs the `vercel-build` script, which generates the Postgres
client, pushes the schema to Neon, and builds Next.js. Locally nothing changes.

## Prerequisites

Free accounts on: [GitHub](https://github.com), [Vercel](https://vercel.com)
(sign in with GitHub), [Neon](https://neon.tech).

## 1 · Push the repo to GitHub

The git repository is already initialized with an initial commit. Create an empty
repo on GitHub (no README/license — keep it empty), then:

```powershell
cd "C:\Users\User\Desktop\Lead Management"
git remote add origin https://github.com/<your-username>/lead-management.git
git push -u origin main
```

`.env` is gitignored — secrets never reach GitHub.

## 2 · Create the Neon database

1. Neon → **New project** — pick region **Singapore (ap-southeast-1)**.
2. On the project dashboard, open **Connection details** and copy the connection
   string. **Turn the "Pooled connection" toggle OFF** (or remove `-pooler` from the
   host) — Prisma's `db push` needs the direct connection, and at demo scale the
   direct URL is fine for the app too. It looks like:
   `postgresql://user:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`

## 3 · Create the Vercel project

1. Vercel → **Add New → Project** → import `lead-management` from GitHub.
   Framework preset auto-detects **Next.js**; leave build settings alone
   (Vercel automatically uses the `vercel-build` script).
2. Before deploying, add **Environment Variables** (all environments):
   - `DATABASE_URL` — the Neon URL from step 2.
   - `SESSION_SECRET` — a long random string. Generate one:
     ```powershell
     node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
     ```
3. **Deploy.** The build generates the Postgres client, creates the tables on Neon
   (`db push`), and builds the app. The public URL is on the project page.

## 4 · Seed the production database (once)

The deployed app has empty tables until you seed it. From your machine, point one
command at Neon, then restore your local client:

```powershell
cd "C:\Users\User\Desktop\Lead Management"
$env:DATABASE_URL = "<the Neon URL>"
npm run db:prod:seed
Remove-Item Env:\DATABASE_URL
npx prisma generate   # restore the local SQLite client
```

> ⚠️ The seed **wipes all data first** (it's a demo reset). Run it against Neon only
> for first-time setup or to reset before the presentation — never after real use.

## 5 · Verify

Open the Vercel URL → you land on the login page. Sign in as `hafiz@company.my` /
`password123` → team dashboard with the seeded pipeline. Check one lead's WhatsApp
panel and status stepper.

## Demo-day setup (Blueprint §11)

- **Primary:** the Vercel URL (seed freshly the night before, step 4).
- **Fallback:** local — `npm run dev` with the SQLite database, no network needed.
  Keep both browser windows ready (Manager + Sales Rep).

## Troubleshooting

- **Build fails at `db push` / P1001 (can't reach database):** the URL is pooled or
  missing `?sslmode=require`. Use the direct (non-pooler) URL from step 2.
- **First request after idle is slow (~1–2 s):** Neon's free tier autosuspends;
  it wakes on the first query. Open the site once before presenting.
- **`postinstall` shows a failed `prisma generate` then a second one succeeding on
  Vercel:** expected — the first attempt uses the dev (SQLite) schema, the fallback
  generates from the Postgres schema. The `vercel-build` step regenerates anyway.
- **Ran `db:prod:seed` and local dev now errors:** your local Prisma client was
  regenerated for Postgres. Run `npx prisma generate` to restore the SQLite client.
- **Rotating secrets:** change `SESSION_SECRET` in Vercel → redeploy. Everyone is
  signed out (sessions are invalidated) — that's the point.
