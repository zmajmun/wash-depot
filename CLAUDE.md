# Wash Depot

Operations + customer platform for **Wash Depot**, a hand car wash. Built for owner Paul Elia (`washdepot1@outlook.com`) and Tony (`zmajmun@gmail.com`, also Owner).

**Live URL:** https://wash-depot-app.vercel.app
**Repo:** https://github.com/zmajmun/wash-depot
**Vercel project:** `wash-depot-app` (team: `zmajmun-7423's projects`, id `team_YA0KcQou9mtJ0RoPK2GzQRYq`)

---

## What this is

A multi-surface SaaS for a car wash + dealership detailing business. Two main interfaces:

1. **Admin / Staff app** at `/dashboard` — Clerk-authenticated. Renders the legacy single-file Alpine.js admin UI (`public/wash-depot.html`) inside an iframe served by `/api/dashboard` with a Clerk identity injected.
2. **Customer PWA** at `/customer-app` — public route, separate from staff. Self-contained Alpine.js app at `public/customer-app.html`. Installable to home screen, has its own service worker (`public/sw.js`) and manifest. Connects to the same Supabase row as admin so data syncs between surfaces.

The admin app started as a single `wash-depot.html` (now ~130KB script + 150 templates) and stayed that way for velocity. **Don't fight that — keep editing the file in place.** The Next.js layer is purely auth + serving + REST endpoints.

---

## Architecture

```
app/
├── layout.tsx              ClerkProvider wrapper
├── page.tsx                Public landing — SignIn/SignUp buttons → /dashboard
├── globals.css
├── dashboard/
│   └── page.tsx            Protected — header + iframe to /api/dashboard
├── customer-app/           (route via rewrite in next.config.ts → /customer-app.html)
└── api/
    ├── dashboard/route.ts  Reads role from Clerk metadata, injects window.__CLERK_USER__ into wash-depot.html
    ├── invitations/route.ts  POST/GET/DELETE Clerk invites (Owner only)
    ├── users/route.ts        GET/PATCH/DELETE Clerk users + roles (Owner only)
    ├── state/route.ts        Single shared app state in Supabase. GET=read all, POST=upsert (Owner+Fleet only)
    ├── customer/
    │   ├── _lib.ts           Supabase helpers + customer sanitization
    │   ├── lookup/route.ts   POST {phone|email} → find existing customer
    │   ├── signup/route.ts   POST → create customer + auto-grant $5 welcome gift
    │   ├── me/route.ts       GET/PATCH ?cid=xxx — customer profile + visits
    │   ├── queue/route.ts    GET — current liveLane count + wait estimate
    │   └── redeem/route.ts   POST — mark a gift as used
    └── notifications/sms/route.ts   GET (status) + POST (send via Twilio)

public/
├── wash-depot.html         The admin Alpine.js app (~130KB)
├── customer-app.html       Customer PWA
├── sw.js                   Customer PWA service worker
├── manifest.webmanifest    PWA manifest
├── icon-192.svg / icon-512.svg
├── splash.jpg              Customer PWA welcome image
└── wash-depot-logo.png     Brand logo (used in admin sidebar)

middleware.ts               Clerk middleware. Protects /dashboard(.*) and /api/dashboard(.*). Other routes are public.
next.config.ts              Rewrite /customer-app → /customer-app.html. Headers for sw.js + manifest.
supabase-schema.sql         The two Postgres tables (app_state, app_state_history)
```

### Data model

A single Supabase row holds **everything** as JSONB:

- Table: `app_state`, primary key `'global'`, column `data jsonb`
- Audit log: `app_state_history` row per write
- All admin reads/writes go through `/api/state`
- Customer-side reads/writes go through `/api/customer/*` (server-mediated, sanitized output)

The `data` blob looks like:
```js
{
  services: [], dealerships: [], detailers: [], vehicles: [],
  invoices: [], notifications: [],
  washPackages: [], washSales: [],
  retailProducts: [], retailSales: [], retailReceivings: [],
  customers: [], visits: [], liveLane: [],
  squareConfig: {}, cameraConfig: {}
}
```

Why a single JSON blob, not normalized tables? Speed-of-build during the prototype phase. When you split this out, do it incrementally: add real tables for `customers`, `vehicles`, `visits` first (highest-velocity entities), keep config blobs as JSONB.

---

## Auth + roles

**Clerk** handles identity. **Roles live in Clerk publicMetadata.role:**
- `owner` — full access (also auto-granted to `washdepot1@outlook.com` and `zmajmun@gmail.com` via `NEXT_PUBLIC_OWNER_EMAIL` env var, comma-separated)
- `fleet` — Fleet Manager: ops only, no $$$, no billing, no Pricing tab in Settings
- `dealer` — scoped to a single dealership via `publicMetadata.dealershipId`. Sees only invoices + payments + bookings.
- `guest` — signed in but no role assigned → "Pending access" screen. Owner invites them via Settings → Users.

Owner email is the safety lever: lose admin metadata and you can still log in as Owner if your email matches `NEXT_PUBLIC_OWNER_EMAIL`.

The HTML app reads `window.__CLERK_USER__` (injected by the dashboard API route) and auto-logs in via `autoLoginFromClerk()`. There's a fallback demo persona picker if no Clerk user is present (used in standalone testing).

---

## Env vars (set in Vercel)

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend |
| `CLERK_SECRET_KEY` | Clerk backend |
| `NEXT_PUBLIC_OWNER_EMAIL` | Comma-separated list of owner emails |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server-only, bypasses RLS) |
| `TWILIO_ACCOUNT_SID` | Twilio |
| `TWILIO_AUTH_TOKEN` | Twilio |
| `TWILIO_FROM` | Twilio sender number (currently `+12249980106` — pending A2P 10DLC verification) |

---

## Major features built

**Admin (sidebar nav, collapsible sections):**

- **Overview** (Owner only): Business Overview, AI Insights
- **Detailing**: Dashboard, Bookings (filter bar), New Intake, Active Jobs (kanban), All Vehicles (status overview boxes → drill-in), Dealerships, Billing
- **Wash & Retail**: Live Lane (AI camera placeholder + CRM lookup), Wash Line, Customers (CRM with + Add Customer drawer), Customer App preview, Retail Products (Overview / Catalog / Receive — SKU scanner check-in)
- **Other**: Notifications, Reports (period filter: today/week/month/quarter/year/custom + period-over-period), Settings (Users & Invites · Pricing · Service Catalog · Detailers · Dealerships · Integrations · Data)

Settings → Integrations: Square (placeholder), Twilio SMS (real, with test panel).

**Customer PWA:**

- Welcome splash with full-bleed `splash.jpg` + glass CTAs (always pinned to bottom, safe-area aware)
- Sign in (phone or email lookup) / Sign up (2-step: contact then vehicle)
- Persistent session via localStorage (`wd_customer_cid`)
- Tabs: Home, Vehicle, Live Line (with SMS/push wait alert), Promos (with redeem), Visits, Account (profile editing)
- Polls `/api/customer/queue` every 12s for live wait
- Auto-grants `WELCOME5` gift on signup
- Service worker caches shell + Tailwind/Alpine for offline

**SMS (Twilio):**

- Real send via `/api/notifications/sms`
- Wired into status changes (Ready/Completed), manual updates, customer line alerts
- Currently blocked at carrier level by A2P 10DLC — needs Sole Proprietor registration + campaign approval (1-2 business days when submitted at https://console.twilio.com/us1/develop/sms/regulatory-compliance/a2p-trust-hub)

---

## Conventions

- **Sidebar**: solid black `#000`, large 96×96 circular logo at top, collapsible section groups with persistence
- **Tier system** (customers): only 4 — `new` (cyan, glow), `regular`, `loyal` (purple), `vip` (pink). Don't reintroduce bronze/silver/gold/member.
- **Drawers**: Airbnb-style minimal — sticky header + body sections + sticky footer with primary action right-aligned. Tier examples: `dealershipDrawer`, `productDrawer`, `newCustomerDrawer`, `activeCustomerId` drawer.
- **Status flow** (vehicles): scheduled → dropped (labeled "Pickup/Drop Off") → queue → service → qc → ready → completed. `arrivalMethod` field tracks 'dropoff' vs 'pickup'. `deliveryMethod` is for the *return* leg.
- **Manual intake** lands in **Scheduled**, not Dropped Off.
- **Custom line items**: rate sheet entries can have `custom: true` with their own `name`/`description` so dealerships can have one-off services that aren't in the global catalog.
- **Money never visible to Fleet Manager**. Use `canSeePrices` getter everywhere.

---

## What's pending / known issues

1. **A2P 10DLC registration** — SMS sends but carriers block until brand+campaign are registered. Manual paperwork at console.twilio.com.
2. **Square integration** — UI exists, fake "Connect Square" modal. Real OAuth + webhook polling not built yet.
3. **AI camera (Live Lane)** — placeholder + simulated detections. Real ALPR camera integration needs vendor selection + webhook receiver.
4. **Push notifications via service worker** — wired but no backend push service. Customer PWA can show local notifications when triggered client-side, but server-initiated push requires a Web Push subscription endpoint.
5. **Customer app auth** — currently phone/email lookup with no OTP. Production needs Twilio Verify or Clerk for customers.
6. **Database normalization** — JSONB blob works for prototype, will hit limits at scale. Migrate `customers`/`vehicles`/`visits`/`washSales`/`retailSales` to proper tables when ready.
7. **Image cache busting** — when replacing logo/splash, browsers + service workers can hold old versions. Bump filenames or add version query strings.

---

## How to develop

```bash
git clone https://github.com/zmajmun/wash-depot.git
cd wash-depot
npm install
cp .env.local.example .env.local
# fill in keys (ask Tony for Clerk + Supabase + Twilio creds)
npm run dev   # http://localhost:3000
```

Push to `main` → Vercel auto-deploys to production. Branch deploys are also created for PRs.

For helper scripts that need to set env vars on Vercel (already in `.gitignore`):
- `setup-and-deploy.sh`, `add-supabase.sh`, `add-twilio.sh`, `update-owner-emails.sh`

These contain a Vercel access token — never commit them. Pattern: `bash setup-and-deploy.sh` from the project root.

---

## Helpful patterns

**Editing the admin app:**
```bash
# All UI lives in public/wash-depot.html.
# Find features fast:
grep -n "STAFF: BOOKINGS\|view==='bookings'" public/wash-depot.html
```
The file uses Alpine.js. State on the root `app()` data object. Don't add a build step — keep it CDN-loaded.

**Adding a new admin view:**
1. Add a new `<template x-if="session.role==='staff' && view==='myview'">` block among the existing ones
2. Add a sidebar nav entry with `view='myview'` click handler
3. Add to the `viewToSection()` map so its containing nav section auto-opens

**Adding a customer-facing API:**
- Drop a new route at `app/api/customer/<name>/route.ts`
- Use the helpers in `_lib.ts` (`loadState`, `saveState`, `publicCustomer`)
- The customer PWA at `customer-app.html` calls these via `fetch('/api/customer/...')`

**SMS:**
- Server-side: `POST /api/notifications/sms` with `{to, body}`
- Client-side helper in admin: `await this.sendSms(phone, msg)` returns `{ok, sid}` or `{ok:false, reason}`
- Gracefully no-ops with `configured: false` when env vars missing

---

## Recent commits (most recent first)

Look at `git log --oneline -50` — commit messages are descriptive (e.g., "Bookings: add filter bar (search, dealer, date, status, logistics, time slot, priority)").
