import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function loadState() {
  const supabase = getSupabase();
  if (!supabase) return { state: {}, configured: false };
  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("id", "global")
    .maybeSingle();
  if (error) throw error;
  return { state: (data?.data as Record<string, unknown>) || {}, configured: true };
}

export async function saveState(state: Record<string, unknown>, by = "customer-app") {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  await supabase.from("app_state").upsert({
    id: "global",
    data: state,
    updated_at: now,
    updated_by: by,
  });
  await supabase.from("app_state_history").insert({ data: state, written_at: now, written_by: by });
}

export const normalizePhone = (p?: string) => (p || "").replace(/\D/g, "");
export const normalizeEmail = (e?: string) => (e || "").toLowerCase().trim();

type Customer = {
  id: string; firstName?: string; lastName?: string; email?: string; phone?: string;
  plate?: string; vehicleYear?: string; vehicleMake?: string; vehicleModel?: string; vehicleColor?: string;
  visitCount?: number; totalSpend?: number; firstSeenAt?: number; lastSeenAt?: number;
  membership?: { type: string; expiresAt: number } | null;
  tags?: string[]; notes?: Array<{ at: number; by: string; text: string }>;
  gifts?: Array<{ id: string; promoId: string; code: string; expiresAt: number; redeemed: boolean; redeemedAt?: number }>;
  favoritePackageId?: string | null;
  notificationPrefs?: { sms?: boolean; push?: boolean; email?: boolean };
  signupSource?: string;
};

export function publicCustomer(c: Customer) {
  return {
    id: c.id,
    firstName: c.firstName || "",
    lastName: c.lastName || "",
    email: c.email || "",
    phone: c.phone || "",
    plate: c.plate || "",
    vehicleYear: c.vehicleYear || "",
    vehicleMake: c.vehicleMake || "",
    vehicleModel: c.vehicleModel || "",
    vehicleColor: c.vehicleColor || "",
    visitCount: c.visitCount || 0,
    totalSpend: c.totalSpend || 0,
    firstSeenAt: c.firstSeenAt,
    lastSeenAt: c.lastSeenAt,
    membership: c.membership || null,
    tags: (c.tags || []).filter((t) => !String(t).startsWith("internal:")),
    gifts: (c.gifts || []).filter((g) => !g.redeemed && g.expiresAt > Date.now()),
    favoritePackageId: c.favoritePackageId,
    notificationPrefs: c.notificationPrefs || { sms: true, push: true, email: true },
    signupSource: c.signupSource,
  };
}

export function findCustomerByContact(state: Record<string, unknown>, phone?: string, email?: string) {
  const customers = (state.customers as Customer[]) || [];
  const np = normalizePhone(phone);
  const ne = normalizeEmail(email);
  return customers.find((c) =>
    (np && normalizePhone(c.phone) === np) ||
    (ne && normalizeEmail(c.email) === ne)
  );
}

export function findCustomerById(state: Record<string, unknown>, id: string) {
  const customers = (state.customers as Customer[]) || [];
  return customers.find((c) => c.id === id);
}

export function customerVisits(state: Record<string, unknown>, customerId: string) {
  const visits = (state.visits as Array<Record<string, unknown>>) || [];
  return visits
    .filter((v) => v.customerId === customerId)
    .sort((a, b) => (Number(b.at) - Number(a.at)));
}

export function rid(prefix: string) {
  return prefix + "_" + Math.random().toString(36).slice(2, 11);
}
