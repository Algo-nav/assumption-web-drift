// The one definition of the Content-Security-Policy. Pages get a per-request nonce (proxy.js);
// API responses are JSON and carry the same policy without one (next.config.mjs).
//
// 'self' alone would block Next's inline bootstrap scripts and stop every page hydrating, so page scripts are
// allowed by nonce + 'strict-dynamic' instead of 'unsafe-inline'. Dev needs 'unsafe-eval' for React's debugging.
//
// `analytics` (pages only, and only when NEXT_PUBLIC_GA_ID is set) adds what GA4 needs and no more: the host
// gtag.js is served from, and the hosts it posts measurements to. The policy allows them on every visit; the
// page only contacts them after the visitor accepts (app/components/GtagLoader.js). These are exact hosts, not wildcards. The
// script itself runs because its tag carries the nonce; browsers that honour 'strict-dynamic' ignore the host
// in script-src, and it is there for the ones that do not.
export const GA_SCRIPT_HOST = "https://www.googletagmanager.com";
export const GA_CONNECT_HOSTS = [
  "https://www.google-analytics.com",
  "https://analytics.google.com",
  "https://region1.google-analytics.com",
  "https://region1.analytics.google.com",
];

// `clarity` (pages only, and only when NEXT_PUBLIC_CLARITY_ID is set) adds Microsoft Clarity's hosts on the same terms:
// allowed by the policy on every visit, contacted only after the visitor accepts (app/components/ClarityLoader.js).
// Clarity spreads its collection endpoints over lettered subdomains, hence the one wildcard.
export const CLARITY_SCRIPT_HOST = "https://www.clarity.ms";
export const CLARITY_CONNECT_HOSTS = ["https://*.clarity.ms", "https://c.bing.com"];
// Clarity also fires image pixels (its c.gif sync), which img-src governs, not connect-src. Exact hosts, no wildcard.
export const CLARITY_IMG_HOSTS = ["https://c.clarity.ms", "https://c.bing.com"];

export function buildCsp({ nonce, dev = false, analytics = false, clarity = false } = {}) {
  const connect = [...(analytics ? GA_CONNECT_HOSTS : []), ...(clarity ? CLARITY_CONNECT_HOSTS : [])];
  const img = ["'self'", "data:", ...(clarity ? CLARITY_IMG_HOSTS : [])];
  const script = ["'self'"];
  if (nonce) script.push(`'nonce-${nonce}'`, "'strict-dynamic'");
  if (dev) script.push("'unsafe-eval'");
  if (analytics) script.push(GA_SCRIPT_HOST);
  if (clarity) script.push(CLARITY_SCRIPT_HOST);
  return [
    "default-src 'self'",
    `img-src ${img.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `script-src ${script.join(" ")}`,
    // Without this directive connections fall back to default-src 'self'; it is only spelled out to add hosts.
    ...(connect.length ? [`connect-src 'self' ${connect.join(" ")}`] : []),
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export const NOSNIFF = { key: "X-Content-Type-Options", value: "nosniff" };
export const REFERRER = { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" };
