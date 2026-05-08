import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

const OWNER_EMAILS = (process.env.NEXT_PUBLIC_OWNER_EMAIL || "washdepot1@outlook.com").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
const OWNER_EMAIL = OWNER_EMAILS[0]; // primary, used for backward compat
const isOwnerEmail = (email: string | undefined) => !!email && OWNER_EMAILS.includes(email.toLowerCase());

async function requireOwner() {
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized", status: 401 };
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;
  if (!isOwnerEmail(email) && role !== "owner") return { error: "Forbidden", status: 403 };
  return { ok: true };
}

function inferRole(email: string | undefined, metaRole: string | undefined) {
  if (isOwnerEmail(email)) return "owner";
  if (metaRole) return metaRole;
  return "guest";
}

export async function GET() {
  const check = await requireOwner();
  if (!check.ok) return new Response(check.error, { status: check.status });

  const client = await clerkClient();
  const list = await client.users.getUserList({ limit: 200 });
  return Response.json({
    users: list.data.map((u) => {
      const email = u.primaryEmailAddress?.emailAddress;
      const meta = u.publicMetadata as { role?: string; dealershipId?: string } | undefined;
      return {
        id: u.id,
        email,
        name: [u.firstName, u.lastName].filter(Boolean).join(" ") || email,
        role: inferRole(email, meta?.role),
        dealershipId: meta?.dealershipId,
        isPaul: isOwnerEmail(email),
        createdAt: u.createdAt,
        lastSignInAt: u.lastSignInAt,
      };
    }),
  });
}

export async function PATCH(req: NextRequest) {
  const check = await requireOwner();
  if (!check.ok) return new Response(check.error, { status: check.status });

  const { userId: targetId, role, dealershipId } = await req.json();
  if (!targetId) return new Response("Missing userId", { status: 400 });
  if (role && !["owner", "fleet", "dealer", "guest"].includes(role)) return new Response("Invalid role", { status: 400 });

  // Don't let Paul (or any owner) demote themselves through this endpoint
  const client = await clerkClient();
  const target = await client.users.getUser(targetId);
  const targetEmail = target.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
  if (isOwnerEmail(targetEmail) && role !== "owner") {
    return new Response("Cannot change a primary owner's role", { status: 400 });
  }

  await client.users.updateUserMetadata(targetId, {
    publicMetadata: { role, ...(dealershipId !== undefined ? { dealershipId } : {}) },
  });
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const check = await requireOwner();
  if (!check.ok) return new Response(check.error, { status: check.status });

  const targetId = new URL(req.url).searchParams.get("id");
  if (!targetId) return new Response("Missing id", { status: 400 });

  const client = await clerkClient();
  await client.users.deleteUser(targetId);
  return Response.json({ ok: true });
}
