import { NextResponse } from "next/server";
import { buildCsp, NOSNIFF, REFERRER } from "./csp.mjs";

// Adds a fresh nonce to every page response. Next reads the nonce from the CSP header on the request and
// stamps it on its own scripts, which is why pages must be rendered per request (see app/layout.js).
export function proxy(request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp({ nonce, dev: process.env.NODE_ENV === "development" });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set(NOSNIFF.key, NOSNIFF.value);
  response.headers.set(REFERRER.key, REFERRER.value);
  return response;
}

// Everything except API routes (next.config.mjs sets their headers) and static build output.
export const config = {
  matcher: [
    {
      // `api(?:/|$)`, not `api`: a page such as /apiary must still get the CSP.
      source: "/((?!api(?:/|$)|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
