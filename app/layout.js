import { Boldonse, IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { connection } from "next/server";
import "./globals.css";
import InlineScript from "./components/InlineScript";
import SiteNav from "./components/SiteNav";
import Footer from "./components/Footer";
import { SITE_NAME, SITE_URL, PRODUCT_NAME } from "./lib/site";

const boldonse = Boldonse({
  variable: "--font-boldonse",
  subsets: ["latin"],
  weight: "400",
});

// Aspekta 2.100, self-hosted (variable, wght 100-900), loaded as on scndorder.com. Source: github.com/ivodolenc/aspekta,
// OFL 1.1 licence alongside the file.
const aspekta = localFont({
  src: "./fonts/aspekta/AspektaVF.woff2",
  variable: "--font-sans",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const description =
  "What 15 companies guided in their SEC filings, and what they reported next. Every row links to the filings.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${PRODUCT_NAME} | ${SITE_NAME}`, template: `%s | ${PRODUCT_NAME}` },
  description,
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: "#0A1A33",
  colorScheme: "dark",
};

export default async function RootLayout({ children }) {
  // Render per request so Next can stamp the CSP nonce from proxy.js on its scripts (static pages have no request).
  await connection();
  // The one inline script below needs that same nonce; proxy.js puts the policy on the request headers.
  const nonce = /'nonce-([^']+)'/.exec((await headers()).get("content-security-policy") || "")?.[1];
  return (
    <html
      lang="en"
      className={`${boldonse.variable} ${aspekta.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* Runs before first paint. The footer wordmark's letters are hidden only under html[data-js], so with
            scripting off or blocked the page is simply visible. */}
        <InlineScript nonce={nonce} html="document.documentElement.dataset.js=''" />
        <a className="skip" href="#main">Skip to content</a>
        <SiteNav />
        <main id="main" className="wrap page">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
