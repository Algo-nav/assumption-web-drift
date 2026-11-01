export const SITE_NAME = "SCND Order";
export const SITE_URL = "https://pilot.scndorder.com";
export const PRODUCT_NAME = "assumption-drift";

export const DATASET_URL = "https://huggingface.co/datasets/Nav772/assumption-drift";
export const SPACE_URL = "https://huggingface.co/spaces/Nav772/assumption-drift";
export const GITHUB_URL = "https://github.com/Algo-nav/assumption-drift";

export const REQUEST_ROLES = ["Analyst", "PM", "Director of research", "CIO", "Other"];

export const REQUESTS_PER_IP_PER_HOUR = 5;
export const REQUESTS_PER_DAY = 50;

// Request-form size limits. The body cap is checked while streaming; the field cap applies to every string field.
export const MAX_REQUEST_BODY_BYTES = 4 * 1024;
export const MAX_REQUEST_FIELD_CHARS = 200;
