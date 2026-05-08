import { loadState, findCustomerByContact, publicCustomer } from "../_lib";

export async function POST(req: Request) {
  try {
    const { phone, email } = await req.json();
    if (!phone && !email) return new Response("Missing phone or email", { status: 400 });

    const { state, configured } = await loadState();
    if (!configured) return new Response("Backend not configured", { status: 503 });

    const customer = findCustomerByContact(state, phone, email);
    if (!customer) return Response.json({ found: false });

    return Response.json({ found: true, customer: publicCustomer(customer) });
  } catch (e: unknown) {
    return new Response(e instanceof Error ? e.message : "Server error", { status: 500 });
  }
}
