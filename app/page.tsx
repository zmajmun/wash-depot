import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default async function Landing() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(ellipse at top, #1a1a1a 0%, #000 70%)",
      padding: "24px",
    }}>
      <div style={{
        background: "#fff", color: "#0f172a",
        borderRadius: "16px", padding: "40px", maxWidth: "440px", width: "100%",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <div style={{ width: "56px", height: "56px", background: "#000", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#fff", fontSize: "20px" }}>WD</div>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 900 }}>Wash Depot</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>Dealership Operations Platform</div>
          </div>
        </div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 6px" }}>Sign in to continue</h1>
        <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 24px" }}>Wash Depot staff and dealership managers.</p>

        <SignedOut>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <SignInButton mode="modal">
              <button style={{ background: "#111827", color: "#fff", border: "none", padding: "14px", borderRadius: "10px", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}>Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button style={{ background: "transparent", color: "#111827", border: "1px solid #d1d5db", padding: "14px", borderRadius: "10px", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}>Create an account</button>
            </SignUpButton>
          </div>
        </SignedOut>
        <SignedIn>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <a href="/dashboard" style={{ background: "#111827", color: "#fff", padding: "14px 22px", borderRadius: "10px", textDecoration: "none", fontWeight: 600 }}>Open dashboard →</a>
            <UserButton />
          </div>
        </SignedIn>

        <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "24px", lineHeight: 1.5 }}>
          Owner: Paul Elia. Other accounts can explore the demo personas.
        </p>
      </div>
    </main>
  );
}
