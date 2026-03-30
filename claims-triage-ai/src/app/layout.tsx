import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClaimsTriage AI",
  description: "Agentic insurance claims triage system powered by Claude tool use",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
