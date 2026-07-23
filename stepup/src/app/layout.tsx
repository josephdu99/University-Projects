import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StepUp — Dance classes, gamified",
  description:
    "Find and book dance classes at local studios or online, track your progress, and compete with friends.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-surface text-ink">
        {children}
      </body>
    </html>
  );
}
