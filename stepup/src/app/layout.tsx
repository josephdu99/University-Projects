import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { EnvironmentRibbon } from "@/components/EnvironmentRibbon";
import { isProduction } from "@/lib/environment";

export const metadata: Metadata = {
  title: "StepUp — Dance classes, gamified",
  description:
    "Find and book dance classes at local studios or online, track your progress, and compete with friends.",
  // Only the live site should ever appear in search results. Test deployments
  // carry the same copy, and duplicates would compete with Production.
  robots: isProduction ? undefined : { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-surface text-ink">
        <Providers>{children}</Providers>
        <EnvironmentRibbon />
      </body>
    </html>
  );
}
