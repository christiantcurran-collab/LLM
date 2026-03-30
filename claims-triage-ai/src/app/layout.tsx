import type { Metadata } from "next";
import { CTCNav } from "@/components/ctc-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "CTC Portfolio",
  description: "Interactive portfolio with AI engineering demos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <CTCNav />
        {children}
      </body>
    </html>
  );
}
