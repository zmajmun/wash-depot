# Wash Depot

Operations + customer platform for Wash Depot, a hand car wash. Built on Next.js 15 + Clerk + Supabase + Twilio, deployed on Vercel.

**Live:** https://wash-depot-app.vercel.app
**Customer PWA:** https://wash-depot-app.vercel.app/customer-app

## For Claude / AI agents

Read **[`CLAUDE.md`](./CLAUDE.md)** first — it has the full architecture, conventions, and pending work.

## Quick start

```bash
npm install
cp .env.local.example .env.local
# fill in Clerk, Supabase, Twilio keys
npm run dev
```

Push to `main` auto-deploys to Vercel.

## Architecture in 30 seconds

- **Admin** at `/dashboard` (Clerk-protected) — iframes `public/wash-depot.html` (Alpine.js single-file app, ~130KB)
- **Customer PWA** at `/customer-app` — public, installable, separate Alpine.js app at `public/customer-app.html`
- **Data**: single Supabase JSONB row, server-mediated via `/api/state` (admin) and `/api/customer/*` (PWA)
- **Auth**: Clerk for staff, phone/email lookup for customers (no OTP yet)
- **SMS**: Twilio (pending A2P 10DLC carrier registration)
