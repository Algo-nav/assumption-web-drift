import { Boldonse, IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { connection } from "next/server";
import "./globals.css";
import Analytics from "./components/Analytics";
import CookieBanner from "./components/CookieBanner";
import InlineScript from "./components/InlineScript";
import Reveals from "./components/Reveals";
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

// Runs before first paint, before any markup in <body>. Two jobs:
// - mark <html data-js>, so things that reveal are hidden only when scripting is on;
// - read the scroll position and write html[data-nav] ("compact" past 80px), and keep it right on every scroll
//   and on every animation frame (a restored scroll position can land a frame before its scroll event) until
//   the nav component mounts. The nav's CSS reads it, so a page that loads already scrolled paints the
//   pill in its first frame. __navSync copies the state onto the nav wrapper once that exists.
const BOOT = `document.documentElement.dataset.js='';(function(){var r=document.documentElement;function s(){var c=window.scrollY>80;r.dataset.nav=c?'compact':'full';var n=document.querySelector('[data-testid="site-nav"]');if(n)n.dataset.compact=String(c)}var on=true;function f(){if(on){s();requestAnimationFrame(f)}}f();window.addEventListener('scroll',s,{passive:true});window.__navSync=s;window.__navBoot=function(){on=false;window.removeEventListener('scroll',s)}})()`;

export const viewport = {
  themeColor: "#0A1A33",
  colorScheme: "dark",
};

export default async function RootLayout({ children }) {
  // Render per request so Next can stamp the CSP nonce from proxy.js on its scripts (static pages have no request).
  await connection();
  // The inline scripts below need that same nonce; proxy.js puts the policy on the request headers.
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
        <InlineScript nonce={nonce} html={BOOT} />
        <a className="skip" href="#main">Skip to content</a>
        {/* The consent default, and gtag.js only once analytics is accepted; both carry the nonce. Nothing when
            NEXT_PUBLIC_GA_ID is unset. */}
        <Analytics nonce={nonce} />
        <SiteNav nonce={nonce} />
        <main id="main" className="wrap page">
          {children}
        </main>
        <Footer />
        <Reveals />
        <CookieBanner />
      </body>
    </html>
  );
}
