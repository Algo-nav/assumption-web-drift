"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";
import { GA_MEASUREMENT_ID } from "../lib/site";
import { installSendGuard, readSaved, serverSnapshot, subscribe } from "../lib/consent";

// Requests gtag.js from Google only once the visitor has accepted analytics: on the accept click, or on load
// for a returning visitor whose saved choice is 'granted'. Before that, and after a decline, no request goes
// to any Google host. This is where this site differs from the main site, which loads gtag.js on every visit
// and relies on the denied consent state alone.
//
// Once requested it stays for the life of the page (a script cannot be unloaded); a later decline switches it
// off, drops anything it still tries to send, denies analytics_storage and deletes its cookies (lib/consent.js), and the next page load does not
// request it.
// Before gtag.js can be requested: this module is evaluated at hydration, the script only after a render.
if (GA_MEASUREMENT_ID) installSendGuard();

export default function GtagLoader({ nonce }) {
  const saved = useSyncExternalStore(subscribe, readSaved, serverSnapshot);
  if (!GA_MEASUREMENT_ID || saved !== "granted") return null;
  return (
    <Script
      id="gtag-js"
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`}
      strategy="afterInteractive"
      nonce={nonce}
    />
  );
}
