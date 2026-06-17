import { clerkMiddleware } from "@clerk/nextjs/server";

// NOTE: We intentionally do NOT call auth.protect() here.
// With Clerk *development* keys on a deployed domain, auth.protect() forces the
// "dev browser" handshake, which can't complete cross-domain and produces an
// infinite 307 redirect loop on /dashboard (black screen, URL bar cycling).
// Instead, clerkMiddleware() just attaches auth context, and each protected
// surface guards itself: /dashboard does `if (!userId) redirect("/")`, and the
// API routes (/api/dashboard, /api/state, /api/invitations, /api/users) all
// return 401/403 on their own. Same protection, no handshake loop.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
