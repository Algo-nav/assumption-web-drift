import { Boldonse, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { SITE_NAME, SITE_URL, PRODUCT_NAME } from "./lib/site";

const boldonse = Boldonse({
  variable: "--font-boldonse",
  subsets: ["latin"],
  weight: "400",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${boldonse.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <body>
        <Header />
        <main className="wrap page">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
