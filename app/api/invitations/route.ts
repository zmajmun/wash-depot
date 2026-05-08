import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

const OWNER_EMAILS = (process.env.NEXT_PUBLIC_OWNER_EMAIL || "washdepot1@outlook.com").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
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

export async function GET() {
  const check = await requireOwner();
  if (!check.ok) return new Response(check.error, { status: check.status });

  const client = await clerkClient();
  const list = await client.invitations.getInvitationList({ status: "pending", limit: 100 });
  return Response.json({
    invitations: list.data.map((i) => ({
      id: i.id,
      email: i.emailAddress,
      status: i.status,
      role: (i.publicMetadata as { role?: string } | undefined)?.role,
      dealershipId: (i.publicMetadata as { dealershipId?: string } | undefined)?.dealershipId,
      createdAt: i.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const check = await requireOwner();
  if (!check.ok) return new Response(check.error, { status: check.status });

  const body = await req.json();
  const { email, role, dealershipId } = body as { email?: string; role?: string; dealershipId?: string };
  if (!email || !role) return new Response("Missing email or role", { status: 400 });
  if (!["owner", "fleet", "dealer"].includes(role)) return new Response("Invalid role", { status: 400 });
  if (role === "dealer" && !dealershipId) return new Response("Dealer invites need a dealershipId", { status: 400 });

  const client = await clerkClient();
  const origin = req.headers.get("origin") || req.nextUrl.origin;
  const invitation = await client.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: `${origin}/dashboard`,
    publicMetadata: { role, ...(dealershipId ? { dealershipId } : {}) },
    ignoreExisting: true,
  });

  return Response.json({ ok: true, invitation: { id: invitation.id, email: invitation.emailAddress } });
}

export async function DELETE(req: NextRequest) {
  const check = await requireOwner();
  if (!check.ok) return new Response(check.error, { status: check.status });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return new Response("Missing id", { status: 400 });

  const client = await clerkClient();
  await client.invitations.revokeInvitation(id);
  return Response.json({ ok: true });
}
