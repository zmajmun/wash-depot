import { createClient } from "@supabase/supabase-js";

// TEMPORARY diagnostic endpoint — surfaces the exact Supabase error behind the
// /api/state 500 so we can tell "project paused" vs "table missing" vs "bad key"
// apart without a Clerk session. Remove once the DB issue is resolved.
export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const present = {
    SUPABASE_URL: !!url,
    SUPABASE_SERVICE_ROLE_KEY: !!key,
    urlHost: url ? (() => { try { return new URL(url).host; } catch { return "invalid-url"; } })() : null,
  };
  if (!url || !key) return Response.json({ ok: false, present, error: "env missing" });
  try {
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb.from("app_state").select("id").limit(1).maybeSingle();
    return Response.json({
      ok: !error,
      present,
      hasRow: !!data,
      error: error
        ? { message: error.message, code: (error as { code?: string }).code, details: (error as { details?: string }).details, hint: (error as { hint?: string }).hint }
        : null,
    });
  } catch (e) {
    const err = e as { message?: string; name?: string; cause?: unknown };
    return Response.json({ ok: false, present, error: { message: err?.message, name: err?.name, cause: String(err?.cause ?? "") } });
  }
}
