"use client";

import { useEffect, useSyncExternalStore } from "react";
import Script from "next/script";
import { CLARITY_ID } from "../lib/site";
import { grantClarity, installSendGuard, readSaved, serverSnapshot, subscribe } from "../lib/consent";

// Microsoft Clarity, behind the same choice as gtag.js and loaded the same way (GtagLoader): the tag is
// requested only once the visitor has accepted analytics, on the accept click or on load for a returning
// visitor whose saved choice is 'granted'. Before that, and after a decline, no request goes to clarity.ms.
//
// This is Clarity's install snippet in parts: the queue shim (grantClarity), then the async tag, carrying the
// page's nonce. A later decline cannot unload it; lib/consent.js withdraws consent, deletes its cookies and
// drops whatever it still tries to send, and the next page load does not request it.
// Before the tag can be requested: this module is evaluated at hydration, the script only after a render.
if (CLARITY_ID) installSendGuard();

export default function ClarityLoader({ nonce }) {
  const saved = useSyncExternalStore(subscribe, readSaved, serverSnapshot);
  const granted = Boolean(CLARITY_ID) && saved === "granted";
  // Runs before the tag does (the tag is fetched over the network), and again on accept after a decline.
  useEffect(() => {
    if (granted) grantClarity();
  }, [granted]);
  if (!granted) return null;
  return (
    <Script
      id="clarity-js"
      src={`https://www.clarity.ms/tag/${encodeURIComponent(CLARITY_ID)}`}
      strategy="afterInteractive"
      nonce={nonce}
    />
  );
}
