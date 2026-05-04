import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { themeCssVariables } from "@/theme/theme";
import { AppShellProvider } from "@/features/app/AppShellProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Velocity Canvas",
  description: "The next-generation Power Apps UI Generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={themeCssVariables as CSSProperties} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <AppShellProvider>{children}</AppShellProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
