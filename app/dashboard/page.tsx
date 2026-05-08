import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

export default async function Dashboard() {
  const { userId } = await auth();
  if (!userId) redirect("/");
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const ownerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL || "washdepot1@outlook.com";
  const role = email.toLowerCase() === ownerEmail.toLowerCase() ? "owner" : "guest";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#000" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#fff" }}>
          <div style={{ width: "32px", height: "32px", background: "#111", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "12px" }}>WD</div>
          <div style={{ fontWeight: 700 }}>Wash Depot</div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {role === "owner" ? "Owner · " + email : "Demo mode · " + email}
          </div>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>
      <iframe
        src={`/api/dashboard?role=${role}&email=${encodeURIComponent(email)}`}
        style={{ flex: 1, width: "100%", border: "none", background: "#fff" }}
        title="Wash Depot Dashboard"
      />
    </div>
  );
}
