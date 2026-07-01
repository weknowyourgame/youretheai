import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import "../node_modules/@react95/core/dist/esm/GlobalStyle/GlobalStyle.css.ts.vanilla.css";
import "../node_modules/@react95/core/dist/esm/themes/win95.css.ts.vanilla.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "You're the AI",
  description:
    "A reverse Turing test: stay helpful, harmless, and honest while a user tries to break you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
