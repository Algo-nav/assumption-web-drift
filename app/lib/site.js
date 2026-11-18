export const SITE_NAME = "SCND Order";
export const SITE_URL = "https://pilot.scndorder.com";
export const PRODUCT_NAME = "assumption-drift";

export const DATASET_URL = "https://huggingface.co/datasets/Nav772/assumption-drift";
export const SPACE_URL = "https://huggingface.co/spaces/Nav772/assumption-drift";
export const GITHUB_URL = "https://github.com/Algo-nav/assumption-drift";

// Company pages live on the main site.
export const MAIN_URL = "https://scndorder.com";
export const ABOUT_URL = "https://scndorder.com/about";
export const CONTACT_URL = "https://scndorder.com/contact";
export const PRIVACY_URL = "https://scndorder.com/privacy";
export const TERMS_URL = "https://scndorder.com/terms";

// Analytics. Empty disables GA4 entirely: no script, no banner, no cookie settings link, no Google hosts in the CSP.
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || "";
// Microsoft Clarity project id. Empty disables Clarity entirely: no tag, no Clarity hosts in the CSP, no mention in the banner.
export const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || "";
// Either tool on: the banner and the footer's Cookie settings link are shown.
export const ANALYTICS_ENABLED = Boolean(GA_MEASUREMENT_ID || CLARITY_ID);

// GA4 writes its cookies on the registrable domain, so a visitor may carry _ga cookies set on any
// scndorder.com host. Declining clears them here as well as on this host.
export const COOKIE_PARENT_DOMAIN = ".scndorder.com";

export const REQUEST_ROLES = ["Analyst", "PM", "Director of research", "CIO", "Other"];

export const REQUESTS_PER_IP_PER_HOUR = 5;
export const REQUESTS_PER_DAY = 50;

// Request-form size limits. The body cap is checked while streaming; the field cap applies to every string field.
export const MAX_REQUEST_BODY_BYTES = 4 * 1024;
export const MAX_REQUEST_FIELD_CHARS = 200;

// Footer follow links. Empty means not set up yet, and the footer leaves the link out.
export const X_URL = "";
export const LINKEDIN_URL = "";
