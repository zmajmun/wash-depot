# Wash Depot

Next.js + Clerk auth. The existing Alpine.js dashboard is served behind Clerk auth via an API route.

## Local dev

```bash
npm install
cp .env.local.example .env.local
# fill in your Clerk keys
npm run dev
```

## Roles

Owner is matched by exact email (`NEXT_PUBLIC_OWNER_EMAIL`, default `washdepot1@outlook.com`). Anyone else lands on the dashboard in demo mode and can pick a persona.

## Deploy

Push to GitHub or use the Vercel CLI. Set the Clerk env vars in the Vercel dashboard.
