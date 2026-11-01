import { side } from "./data/polarity.js";
// Prints guided and reported figures with their units, from the dataset's own unit strings.

function num(n) {
  if (n == null) return "";
  const abs = Math.abs(n);
  const s = abs >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(Number(n.toFixed(4)));
  return s;
}

function money(n, suffix) {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${num(Math.abs(n))}${suffix}`;
}

function one(n, unit) {
  switch (unit) {
    case "percent":
      return `${num(n)}%`;
    case "USD billions":
      return money(n, " billion");
    case "USD millions":
      return money(n, " million");
    case "USD per share":
      return money(n, " per share");
    case "basis points":
      return `${num(n)} bps`;
    default:
      return `${num(n)} ${unit}`;
  }
}

// Short form used inside a range: "$60 to $65 billion" keeps the unit once.
function bare(n, unit) {
  switch (unit) {
    case "percent":
      return `${num(n)}%`;
    case "USD billions":
    case "USD millions":
    case "USD per share":
      return money(n, "");
    case "basis points":
      return num(n);
    default:
      return num(n);
  }
}

const TAIL = { "USD billions": " billion", "USD millions": " million", "USD per share": " per share", "basis points": " bps" };

export function formatValue(n, unit) {
  return n == null ? "none" : one(n, unit);
}

export function formatGuided(low, high, unit) {
  if (low != null && high == null) return `at least ${one(low, unit)}`;
  if (low == null && high != null) return `at most ${one(high, unit)}`;
  if (low === high) return one(low, unit);
  return `${bare(low, unit)} to ${bare(high, unit)}${TAIL[unit] || ""}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2019-01-28" -> "28 Jan 2019". Parsed by hand so the time zone never shifts the day.
export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso || "";
}

export function daysBetween(a, b) {
  const t = (d) => Date.parse(`${String(d).slice(0, 10)}T00:00:00Z`);
  const n = Math.round((t(b) - t(a)) / 86400000);
  return Number.isFinite(n) ? n : null;
}

// One plain sentence built from the row's own fields.
export function describeRow(r) {
  const guided = `Guided ${formatGuided(r.low, r.high, r.unit)} on ${formatDate(r.statedAt)}`;
  if (r.reported == null) {
    return r.status === "withdrawn" ? `${guided}; withdrawn.` : `${guided}; no filing has reported it yet.`;
  }
  const gap = daysBetween(r.statedAt, r.reportedAt);
  const when = gap == null ? "" : gap === 0 ? " the same day" : ` ${gap} day${gap === 1 ? "" : "s"} later`;
  const sd = side(r.low, r.high, r.reported);
  let where;
  if (r.status === "met" || !sd) {
    where = r.status === "met" ? (r.low === r.high ? "on the guided figure" : "inside the range") : "outside the range";
  } else {
    const bound = sd === "above" ? (r.high ?? r.low) : (r.low ?? r.high);
    const pct = bound ? (Math.abs(r.reported - bound) / Math.abs(bound)) * 100 : null;
    where = `${sd} the range${pct == null ? "" : ` by ${pct.toFixed(1)}%`}${r.direction ? `, ${r.direction} than guided` : ""}`;
  }
  return `${guided}; reported ${formatValue(r.reported, r.unit)}${when}; ${where}.`;
}

// A distance in the metric's own unit: "$0.25 per share", "$2.9 billion", "15 points", "50 bps".
export function formatBy(n, unit) {
  if (n == null) return "";
  return unit === "percent" ? `${num(n)} points` : one(n, unit);
}
