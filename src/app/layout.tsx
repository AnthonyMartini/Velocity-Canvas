import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { themeCssVariables } from "@/theme/theme";

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
    <html lang="en" style={themeCssVariables as CSSProperties}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
