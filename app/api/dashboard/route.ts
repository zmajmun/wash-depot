import { auth, currentUser } from "@clerk/nextjs/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const ownerEmails = (process.env.NEXT_PUBLIC_OWNER_EMAIL || "washdepot1@outlook.com").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  const isOwnerByEmail = ownerEmails.includes(email.toLowerCase());
  const meta = (user?.publicMetadata || {}) as { role?: string; dealershipId?: string };

  // role priority: owner-by-email > metadata role > guest
  let role: string = isOwnerByEmail ? "owner" : (meta.role || "guest");

  const dealershipId = meta.dealershipId || null;
  const name = user?.firstName || email.split("@")[0];

  const filePath = path.join(process.cwd(), "public", "wash-depot.html");
  let html = fs.readFileSync(filePath, "utf-8");

  const inject = `<script>window.__CLERK_USER__ = ${JSON.stringify({ email, role, name, dealershipId, isOwner: role === "owner" })};</script>`;
  html = html.replace("</head>", inject + "</head>");

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
