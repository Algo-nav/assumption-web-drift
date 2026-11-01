import { buildCsp, NOSNIFF, REFERRER } from "./csp.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      // Pages get their CSP (with a nonce) from proxy.js. A second CSP header here would be intersected with it
      // and block the nonced scripts, so this one is scoped to the JSON API only.
      {
        source: "/api/:path*",
        headers: [
          { key: "Content-Security-Policy", value: buildCsp({ dev: process.env.NODE_ENV === "development" }) },
          NOSNIFF,
          REFERRER,
        ],
      },
    ];
  },
};

export default nextConfig;
