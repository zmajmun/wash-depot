// SMS sending via Twilio REST API.
// Requires three env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
// If any are missing, returns 503 + configured:false so callers can fall back gracefully.

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_FROM;

function normalizeUSPhone(input: string): string | null {
  const digits = String(input || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  if (input.startsWith("+")) return input.trim();
  return null;
}

export async function GET() {
  return Response.json({
    configured: !!(SID && TOKEN && FROM),
    fromMasked: FROM ? FROM.slice(0, 4) + "…" + FROM.slice(-4) : null,
  });
}

export async function POST(req: Request) {
  try {
    const { to, body, from } = await req.json();
    if (!to || !body) return new Response("Missing to or body", { status: 400 });
    if (!SID || !TOKEN || !FROM) {
      return Response.json(
        { ok: false, configured: false, error: "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM in Vercel env vars." },
        { status: 503 }
      );
    }
    const toNumber = normalizeUSPhone(to);
    if (!toNumber) return new Response("Invalid 'to' phone number — use E.164 (e.g. +15551234567) or 10-digit US.", { status: 400 });
    const fromNumber = from || FROM;

    const authHeader = "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64");
    const params = new URLSearchParams({ To: toNumber, From: fromNumber, Body: String(body).slice(0, 1600) });

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(errText, { status: res.status });
    }
    const data = await res.json();
    return Response.json({ ok: true, sid: data.sid, status: data.status, to: toNumber, from: fromNumber });
  } catch (e: unknown) {
    return new Response(e instanceof Error ? e.message : "Server error", { status: 500 });
  }
}
