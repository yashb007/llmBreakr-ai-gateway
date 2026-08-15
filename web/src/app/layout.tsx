import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "llmBreakr — Smart Gateway",
  description: "Admin dashboard for the llmBreakr Smart gateway",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies a stored "light" preference before first paint so there's
            no flash of the default dark theme for light-mode users — dark
            needs no script since it's already what the server renders. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{if(localStorage.getItem('llmbreakr-theme')==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}`}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
