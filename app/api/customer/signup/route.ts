import { loadState, saveState, findCustomerByContact, publicCustomer, rid } from "../_lib";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, plate, vehicleYear, vehicleMake, vehicleModel, vehicleColor, notificationPrefs } = body;
    if (!firstName) return new Response("First name required", { status: 400 });
    if (!email && !phone) return new Response("Email or phone required", { status: 400 });

    const { state, configured } = await loadState();
    if (!configured) return new Response("Backend not configured", { status: 503 });

    // Prevent duplicate signup with same contact
    const existing = findCustomerByContact(state, phone, email);
    if (existing) {
      return Response.json({ created: false, customer: publicCustomer(existing) });
    }

    const now = Date.now();
    const customer = {
      id: rid("cust"),
      firstName: String(firstName).trim(),
      lastName: String(lastName || "").trim(),
      email: String(email || "").toLowerCase().trim(),
      phone: String(phone || "").trim(),
      plate: String(plate || "").toUpperCase().trim(),
      vehicleYear: String(vehicleYear || "").trim(),
      vehicleMake: String(vehicleMake || "").trim(),
      vehicleModel: String(vehicleModel || "").trim(),
      vehicleColor: String(vehicleColor || "").trim(),
      visitCount: 0,
      totalSpend: 0,
      firstSeenAt: now,
      lastSeenAt: now,
      membership: null,
      tags: ["app-signup"],
      notes: [{ at: now, by: "system", text: "Signed up via mobile app" }],
      gifts: [
        // Welcome bonus for app signups
        {
          id: rid("gift"),
          promoId: "promo_app_welcome",
          code: "WELCOME5",
          expiresAt: now + 30 * 86400000,
          redeemed: false,
          message: "Welcome to Wash Depot! $5 off your next wash.",
        },
      ],
      favoritePackageId: null,
      notificationPrefs: notificationPrefs || { sms: !!phone, push: true, email: !!email },
      signupSource: "mobile-app",
    };

    state.customers = [...((state.customers as unknown[]) || []), customer];
    await saveState(state, "customer-signup:" + customer.id);

    return Response.json({ created: true, customer: publicCustomer(customer) });
  } catch (e: unknown) {
    return new Response(e instanceof Error ? e.message : "Server error", { status: 500 });
  }
}
