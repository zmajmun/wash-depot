import { loadState, saveState } from "../_lib";

export async function POST(req: Request) {
  try {
    const { cid, giftId } = await req.json();
    if (!cid || !giftId) return new Response("Missing cid or giftId", { status: 400 });

    const { state, configured } = await loadState();
    if (!configured) return new Response("Backend not configured", { status: 503 });

    const customers = (state.customers as Array<Record<string, unknown>>) || [];
    const idx = customers.findIndex((c) => c.id === cid);
    if (idx < 0) return new Response("Not found", { status: 404 });
    const customer = customers[idx] as { gifts?: Array<{ id: string; redeemed?: boolean; redeemedAt?: number }> };
    const gift = customer.gifts?.find((g) => g.id === giftId);
    if (!gift) return new Response("Gift not found", { status: 404 });
    if (gift.redeemed) return Response.json({ ok: true, already: true });

    gift.redeemed = true;
    gift.redeemedAt = Date.now();
    await saveState(state, "customer-redeem:" + cid);
    return Response.json({ ok: true });
  } catch (e: unknown) {
    return new Response(e instanceof Error ? e.message : "Server error", { status: 500 });
  }
}
