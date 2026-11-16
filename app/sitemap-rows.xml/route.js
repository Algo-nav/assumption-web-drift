import { rowEntries, urlsetXml, xmlResponse } from "../lib/sitemaps";

// Written once at build time from the dataset (app/lib/sitemaps.js).
export const dynamic = "force-static";

export function GET() {
  return xmlResponse(urlsetXml(rowEntries()));
}
