const SEC_PREFIX = "https://www.sec.gov/";

// An evidence link is rendered as a link only when it points at www.sec.gov over https. Both the prefix and a
// parsed origin are checked, so look-alikes such as https://www.sec.gov@evil.example/ or https://www.sec.gov.evil.example/
// and any javascript:, data: or vbscript: URL fail.
export function isSecUrl(url) {
  if (typeof url !== "string" || !url.startsWith(SEC_PREFIX)) return false;
  try {
    return new URL(url).origin === "https://www.sec.gov";
  } catch {
    return false;
  }
}
