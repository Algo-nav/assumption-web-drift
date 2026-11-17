import { buildCsp, NOSNIFF, REFERRER } from "./csp.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The pilot's /about page moved to the end of the methodology.
  async redirects() {
    return [{ source: "/about", destination: "/methodology#provenance", permanent: true }];
  },
  // IndexNow key file: /<key>.txt is answered by app/indexnow-key/[file]/route.js, which checks the name against
  // INDEXNOW_KEY at request time. The pattern is IndexNow's key format (8 to 128 of a-z, A-Z, 0-9, dash), so
  // any other unknown address still gets the not-found page.
  async rewrites() {
    return [{ source: "/:file([A-Za-z0-9-]{8,128}\\.txt)", destination: "/indexnow-key/:file" }];
  },
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
