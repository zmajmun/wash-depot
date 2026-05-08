import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = (process.env.NEXT_PUBLIC_OWNER_EMAIL || "washdepot1@outlook.com").toLowerCase();

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function userInfo() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
  const meta = (user?.publicMetadata || {}) as { role?: string };
  let role = meta.role || "guest";
  if (email === OWNER_EMAIL) role = "owner";
  return { email, role };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ state: null, configured: false });
  }
  const { data, error } = await supabase
    .from("app_state")
    .select("data, updated_at, updated_by")
    .eq("id", "global")
    .maybeSingle();
  if (error) return new Response(error.message, { status: 500 });
  return Response.json({
    state: data?.data || null,
    updatedAt: data?.updated_at || null,
    updatedBy: data?.updated_by || null,
    configured: true,
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { email, role } = await userInfo();
  // Dealers can read but not write the global state. Owner & fleet can write.
  if (role !== "owner" && role !== "fleet") return new Response("Forbidden", { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return new Response("Supabase not configured", { status: 503 });

  const body = await req.json();
  if (!body || typeof body.state !== "object") return new Response("Missing state", { status: 400 });

  const now = new Date().toISOString();
  const upsert = await supabase.from("app_state").upsert({
    id: "global",
    data: body.state,
    updated_at: now,
    updated_by: email,
  });
  if (upsert.error) return new Response(upsert.error.message, { status: 500 });

  // Best-effort history log; non-fatal if it fails
  await supabase.from("app_state_history").insert({ data: body.state, written_at: now, written_by: email });

  return Response.json({ ok: true, updatedAt: now });
}
