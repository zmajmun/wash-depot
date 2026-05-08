import { loadState, saveState, findCustomerById, publicCustomer, customerVisits } from "../_lib";

type Visit = { id: string; customerId: string; at: number; packageId: string; amount: number };

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const cid = url.searchParams.get("cid");
    if (!cid) return new Response("Missing cid", { status: 400 });

    const { state, configured } = await loadState();
    if (!configured) return new Response("Backend not configured", { status: 503 });

    const customer = findCustomerById(state, cid);
    if (!customer) return new Response("Not found", { status: 404 });

    const visits = customerVisits(state, cid).slice(0, 100) as Visit[];
    const washPackages = (state.washPackages as Array<{id:string;name:string;price:number}>) || [];
    const enrichedVisits = visits.map((v) => {
      const pkg = washPackages.find((p) => p.id === v.packageId);
      return {
        id: v.id,
        at: v.at,
        amount: v.amount,
        packageId: v.packageId,
        packageName: pkg?.name || "Wash",
      };
    });

    return Response.json({
      customer: publicCustomer(customer),
      visits: enrichedVisits,
      packages: washPackages,
    });
  } catch (e: unknown) {
    return new Response(e instanceof Error ? e.message : "Server error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const url = new URL(req.url);
    const cid = url.searchParams.get("cid");
    if (!cid) return new Response("Missing cid", { status: 400 });

    const patch = await req.json();
    const { state, configured } = await loadState();
    if (!configured) return new Response("Backend not configured", { status: 503 });

    const customers = (state.customers as Array<Record<string, unknown>>) || [];
    const idx = customers.findIndex((c) => c.id === cid);
    if (idx < 0) return new Response("Not found", { status: 404 });

    const allowed = ["firstName", "lastName", "email", "phone", "plate", "vehicleYear", "vehicleMake", "vehicleModel", "vehicleColor", "notificationPrefs"];
    const cleaned: Record<string, unknown> = {};
    for (const k of allowed) if (k in patch) cleaned[k] = patch[k];
    customers[idx] = { ...customers[idx], ...cleaned };
    state.customers = customers;
    await saveState(state, "customer-update:" + cid);

    return Response.json({ ok: true, customer: publicCustomer(customers[idx] as never) });
  } catch (e: unknown) {
    return new Response(e instanceof Error ? e.message : "Server error", { status: 500 });
  }
}
