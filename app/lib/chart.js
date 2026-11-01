import { formatGuided, formatValue } from "./format.js";

// Turns a company's rows into chart groups: one group per metric, period length and unit family.
// Money is put on one scale so a millions row and a billions row of the same metric share an axis.

const TO_BASE = { "USD billions": 1e9, "USD millions": 1e6 };

function family(unit) {
  return unit in TO_BASE ? "USD" : unit;
}

function base(n, unit) {
  return n == null ? null : n * (TO_BASE[unit] || 1);
}

const t = (d) => Date.parse(`${String(d).slice(0, 10)}T00:00:00Z`);

export function chartGroups(rows) {
  const groups = new Map();
  for (const r of rows) {
    const lo = base(r.low ?? r.high, r.unit);
    const hi = base(r.high ?? r.low, r.unit);
    if (lo == null || hi == null) continue;
    const kind = /^Q\d/.test(r.period) ? "quarterly" : "annual";
    const key = `${r.metric}|${kind}|${family(r.unit)}`;
    if (!groups.has(key)) {
      groups.set(key, { key, metric: r.metric, metricBase: r.metricBase, basis: r.basis, kind, family: family(r.unit), points: [] });
    }
    groups.get(key).points.push({
      id: r.id,
      period: r.period,
      status: r.status,
      direction: r.direction,
      lo: Math.min(lo, hi),
      hi: Math.max(lo, hi),
      rep: r.reported == null ? null : base(r.reported, r.unit),
      x0: t(r.statedAt),
      x1: r.reportedAt ? t(r.reportedAt) : null,
      statedAt: r.statedAt,
      reportedAt: r.reportedAt,
      text: `${r.period}: guided ${formatLine(r)}`,
    });
  }
  const list = [...groups.values()];
  for (const g of list) {
    g.resolved = g.points.filter((p) => (p.status === "met" || p.status === "missed") && p.rep != null).length;
    const sameMetric = list.filter((o) => o.metric === g.metric);
    const kinds = new Set(sameMetric.map((o) => o.kind)).size > 1;
    const fams = new Set(sameMetric.map((o) => o.family)).size > 1;
    const name = g.basis === "n/a" ? g.metricBase : `${g.metricBase}, ${g.basis}`;
    const extra = [kinds ? g.kind : null, fams ? g.family : null].filter(Boolean);
    g.title = extra.length ? `${name} (${extra.join(", ")})` : name;
  }
  return list;
}

function formatLine(r) {
  const rep = r.reported == null ? "no outcome yet" : `reported ${formatValue(r.reported, r.unit)}`;
  return `${formatGuided(r.low, r.high, r.unit)} (${r.statedAt}), ${rep}${r.status ? `, ${r.status}` : ""}${r.direction ? `, ${r.direction}` : ""}`;
}

export function niceTicks(min, max, n = 4) {
  const span = max - min || Math.abs(max) || 1;
  const raw = span / n;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) || pow * 10;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}

export function formatTick(v, fam) {
  const trim = (x) => String(Number(x.toFixed(2)));
  if (fam === "USD") {
    const a = Math.abs(v);
    if (a >= 1e9) return `$${trim(v / 1e9)}B`;
    if (a >= 1e6) return `$${trim(v / 1e6)}M`;
    return `$${trim(v)}`;
  }
  if (fam === "percent") return `${trim(v)}%`;
  if (fam === "USD per share") return `$${trim(v)}`;
  if (fam === "basis points") return `${trim(v)} bps`;
  return trim(v);
}

// "log" when the largest plotted value is more than 10 times the smallest, "linear" otherwise.
// Percent metrics are always linear, and so is anything that reaches zero or below, which a log axis cannot show.
export function scaleFor(group) {
  if (group.family === "percent" || group.family === "basis points") return "linear";
  const vals = group.points.flatMap((p) => [p.lo, p.hi, ...(p.rep == null ? [] : [p.rep])]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return min > 0 && max / min > 10 ? "log" : "linear";
}

// Ticks at 1, 2 and 5 times each power of ten, thinned to about `n` when the range is wide.
export function logTicks(min, max, n = 5) {
  const all = [];
  for (let k = Math.floor(Math.log10(min)); k <= Math.ceil(Math.log10(max)); k++) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** k;
      if (v >= min && v <= max) all.push(v);
    }
  }
  const decades = all.filter((v) => Math.abs(Math.log10(v) - Math.round(Math.log10(v))) < 1e-9);
  if (all.length <= n + 2) return all;
  return decades.length >= 2 ? decades : all.filter((_, i) => i % Math.ceil(all.length / n) === 0);
}
