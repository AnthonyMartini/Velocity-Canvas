import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { themeCssVariables } from "@/theme/theme";
import { AppShellProvider } from "@/features/app/AppShellProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: {
    default: "Velocity Canvas — AI Power Apps UI Generator",
    template: "%s — Velocity Canvas",
  },
  description:
    "Build Power Apps canvas layouts at the speed of thought. Describe your UI in plain English and get production-ready Power Apps YAML in seconds. Free to start.",
  keywords: [
    "Power Apps",
    "Power Apps generator",
    "Power Apps YAML",
    "Power Apps UI builder",
    "Power Apps AI",
    "canvas app builder",
    "Power Platform",
    "low-code AI",
  ],
  authors: [{ name: "Anthony Martini" }],
  metadataBase: new URL("https://velocitycanvas.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://velocitycanvas.app",
    title: "Velocity Canvas — AI Power Apps UI Generator",
    description:
      "Build Power Apps canvas layouts at the speed of thought. AI-powered YAML generation, live canvas preview, and seamless export to Power Apps Studio.",
    siteName: "Velocity Canvas",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Velocity Canvas — AI Power Apps UI Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Velocity Canvas — AI Power Apps UI Generator",
    description:
      "Describe your UI in plain English. Get Power Apps YAML in seconds. Free to start.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "_Z-ci2Gtj4MTSrp1mXy2q3k-bAIjV2rhANloAIB1cfs",
  },
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
