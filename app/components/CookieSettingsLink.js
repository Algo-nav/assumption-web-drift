"use client";

import { GA_MEASUREMENT_ID } from "../lib/site";

// Footer link that reopens the consent banner. Renders nothing when GA is off.
export default function CookieSettingsLink({ style }) {
  if (!GA_MEASUREMENT_ID) return null;
  return (
    <button
      type="button"
      style={{ ...style, background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit" }}
      onClick={() => window.dispatchEvent(new Event("scnd:open-consent"))}
    >
      Cookie settings
    </button>
  );
}
