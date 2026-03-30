import Link from "next/link";

export default function Home() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Arial, Helvetica, sans-serif",
      background: "linear-gradient(135deg, #1a3a5c 0%, #0f2440 60%, #0a1628 100%)",
      color: "white",
      padding: "2rem",
      textAlign: "center",
    }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
        ClaimsTriage AI
      </h1>
      <p style={{ fontSize: "1.1rem", opacity: 0.8, maxWidth: 500, marginBottom: "2rem" }}>
        Agentic insurance claims triage powered by Claude tool use
      </p>
      <div style={{ display: "flex", gap: "1rem" }}>
        <Link
          href="/claims-triage"
          style={{
            padding: "0.75rem 2rem",
            background: "rgba(42, 139, 124, 0.9)",
            color: "white",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
          }}
        >
          Triage Demo
        </Link>
        <Link
          href="/eval"
          style={{
            padding: "0.75rem 2rem",
            background: "rgba(255, 255, 255, 0.15)",
            color: "white",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          Eval Suite
        </Link>
      </div>
    </div>
  );
}
