"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { GA_MEASUREMENT_ID, PRIVACY_URL } from "../lib/site";
import { applyConsent, PENDING, readSaved, serverSnapshot, subscribe } from "../lib/consent";

// Consent banner, ported from the main site (scndorder-site app/components/CookieBanner.js). Shown once until
// the visitor chooses. The choice itself lives in lib/consent.js; accepting is what lets GtagLoader request gtag.js.
// Re-openable via window.dispatchEvent(new Event('scnd:open-consent')) (the footer "Cookie settings" link
// fires this).
//
// What differs from the main site: the styles are this site's classes (.consent in globals.css, and the
// shared .btn), and the Privacy Policy link goes to the main site, where the policy lives. Accepting
// analytics is not the page's primary action, so the button is the solid powder one, not scarlet.

export default function CookieBanner() {
  // "pending" is the server snapshot: render nothing until the client has read storage.
  const saved = useSyncExternalStore(subscribe, readSaved, serverSnapshot);
  const [forcedOpen, setForcedOpen] = useState(false);

  useEffect(() => {
    const reopen = () => setForcedOpen(true);
    window.addEventListener("scnd:open-consent", reopen);
    return () => window.removeEventListener("scnd:open-consent", reopen);
  }, []);

  const open = GA_MEASUREMENT_ID && (forcedOpen || saved === null) && saved !== PENDING;
  if (!open) return null;

  const choose = (value) => {
    applyConsent(value);
    setForcedOpen(false);
  };

  return (
    <div role="dialog" aria-live="polite" aria-label="Cookie choices" className="consent">
      <p>
        We use Google Analytics to see how visitors find this site. It only runs if you accept. Essential
        cookies remember your choice.{" "}
        <a className="textlink" href={PRIVACY_URL}>Privacy Policy</a>
      </p>
      <div className="consent-actions">
        <button type="button" className="btn sm solid" onClick={() => choose("granted")}>
          Accept analytics
        </button>
        <button type="button" className="btn sm ghost" onClick={() => choose("denied")}>
          Decline
        </button>
      </div>
    </div>
  );
}
