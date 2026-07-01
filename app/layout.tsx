import type { Metadata } from "next";
import "../node_modules/@react95/core/dist/esm/GlobalStyle/GlobalStyle.css.ts.vanilla.css";
import "../node_modules/@react95/core/dist/esm/themes/win95.css.ts.vanilla.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prompt Panic 95",
  description:
    "A Windows 95-style prompt-defense game about staying helpful without leaking fictional private data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
