// Which way is good for each metric. Copied from higher_is_better in pipeline/config.yaml of the
// assumption-drift code repo. The published file has no direction field, so direction is computed
// from the guided range, the reported value and this table, the way the dataset's own stats do.
const HIGHER_IS_BETTER = {
  revenue: true,
  "gross margin GAAP": true,
  "gross margin non-GAAP": true,
  "operating expenses GAAP": false,
  "operating expenses non-GAAP": false,
  "operating margin GAAP": true,
  "operating margin non-GAAP": true,
  "operating income": true,
  "EPS GAAP": true,
  "EPS non-GAAP": true,
  "tax rate": false,
  "other income and expense": true,
  "comparable sales": true,
  "free cash flow": true,
  "total expenses": false,
  "capital expenditures": false,
};

export function higherIsBetter(metric) {
  if (!(metric in HIGHER_IS_BETTER)) throw new Error(`no polarity for metric ${metric}`);
  return HIGHER_IS_BETTER[metric];
}

const slack = (bound) => 1e-9 * Math.max(Math.abs(bound), 1);

// "above" the high end, "below" the low end, or null when inside the range (endpoints included).
export function side(low, high, value) {
  if (value == null || (low == null && high == null)) return null;
  if (low != null && high != null && low === high) {
    if (Math.abs(value - low) <= slack(low)) return null;
    return value > low ? "above" : "below";
  }
  if (high != null && value > high + slack(high)) return "above";
  if (low != null && value < low - slack(low)) return "below";
  return null;
}

export function directionOf(low, high, value, higherBetter) {
  const landed = side(low, high, value);
  if (!landed) return null;
  return (landed === "above") === higherBetter ? "better" : "worse";
}
