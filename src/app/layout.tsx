import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { themeCssVariables } from "@/theme/theme";
import { AppShellProvider } from "@/features/app/AppShellProvider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: {
    default: "Velocity Canvas — Modern Power Apps Layout & Design Generator",
    template: "%s — Velocity Canvas",
  },
  description:
    "Generate beautiful, modern Power Apps layouts instantly with AI. Solve responsive container spacing, design professional screens, and copy-paste directly to Power Apps Studio. Free to start.",
  keywords: [
    "make power apps look modern",
    "power apps modern UI templates",
    "power apps layout generator",
    "power apps design templates",
    "how to make power apps responsive",
    "AI layout generator for power apps",
    "power apps container spacing",
    "power apps dashboard design",
    "power apps login screen template",
    "power platform auto layout",
    "power apps UI kit",
  ],
  authors: [{ name: "Anthony Martini" }],
  metadataBase: new URL("https://www.velocitycanvas.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://www.velocitycanvas.com",
    title: "Velocity Canvas — Modern Power Apps Layout & Design Generator",
    description:
      "Create modern, responsive Power Apps layout templates instantly with AI. Solve container auto-layout grids and copy-paste designs directly to Power Apps Studio.",
    siteName: "Velocity Canvas",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Velocity Canvas — Modern Power Apps Layout & Design Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Velocity Canvas — Modern Power Apps Layout & Design Generator",
    description:
      "Create beautiful, responsive Power Apps screen designs instantly with AI. Auto-layout container grids and copy-paste directly to your app.",
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
