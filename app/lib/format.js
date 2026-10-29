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
