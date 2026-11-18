"use client";

import { ANALYTICS_ENABLED } from "../lib/site";

// Footer link that reopens the consent banner. Renders nothing when neither GA nor Clarity is configured.
export default function CookieSettingsLink({ style }) {
  if (!ANALYTICS_ENABLED) return null;
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
