// The one definition of the Content-Security-Policy. Pages get a per-request nonce (proxy.js);
// API responses are JSON and carry the same policy without one (next.config.mjs).
//
// 'self' alone would block Next's inline bootstrap scripts and stop every page hydrating, so page scripts are
// allowed by nonce + 'strict-dynamic' instead of 'unsafe-inline'. Dev needs 'unsafe-eval' for React's debugging.
export function buildCsp({ nonce, dev = false } = {}) {
  const script = ["'self'"];
  if (nonce) script.push(`'nonce-${nonce}'`, "'strict-dynamic'");
  if (dev) script.push("'unsafe-eval'");
  return [
    "default-src 'self'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${script.join(" ")}`,
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export const NOSNIFF = { key: "X-Content-Type-Options", value: "nosniff" };
export const REFERRER = { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" };
