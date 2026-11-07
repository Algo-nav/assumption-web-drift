import { formatGuided, formatValue } from "./format.js";
import { fiscalYearEnd } from "./data/fiscal.js";

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
      groups.set(key, { key, ticker: r.ticker, metric: r.metric, metricBase: r.metricBase, basis: r.basis, kind, family: family(r.unit), points: [] });
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

// Round tick values inside [min, max], three to five of them: steps of 1, 2, 2.5 or 5 times a power of ten,
// preferring four ticks, then five, then three.
export function niceTicks(min, max) {
  const span = max - min || Math.abs(max) || 1;
  const tries = [];
  for (let k = Math.floor(Math.log10(span)) - 2; k <= Math.floor(Math.log10(span)) + 1; k++) {
    for (const m of [1, 2, 2.5, 5]) {
      const step = m * 10 ** k;
      const out = [];
      for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-9; v += step) out.push(Number(v.toPrecision(12)));
      tries.push(out);
    }
  }
  const rank = (n) => (n === 4 ? 0 : n === 5 ? 1 : n === 3 ? 2 : 3 + Math.abs(n - 4));
  return tries.sort((a, b) => rank(a.length) - rank(b.length))[0];
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

// Log-axis ticks inside [min, max]: the coarsest of decades, 1-3, 1-2-5 or 1-2-3-5 per decade that gives three to
// five ticks, or the nearest to four if none does.
export function logTicks(min, max) {
  const sets = [[1], [1, 3], [1, 2, 5], [1, 2, 3, 5]];
  const tries = sets.map((ms) => {
    const out = [];
    for (let k = Math.floor(Math.log10(min)); k <= Math.ceil(Math.log10(max)); k++) {
      for (const m of ms) {
        const v = Number((m * 10 ** k).toPrecision(12));
        if (v >= min * (1 - 1e-9) && v <= max * (1 + 1e-9)) out.push(v);
      }
    }
    return out;
  });
  const ok = tries.find((t) => t.length >= 3 && t.length <= 5);
  return ok || tries.sort((a, b) => Math.abs(a.length - 4) - Math.abs(b.length - 4))[0];
}

function quantile(sorted, q) {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  return sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo);
}

// The y range to plot, in axis units (log10 for a log axis). The median cluster is the middle 80% of the plotted
// values (10th to 90th percentile). When showing every value would squeeze that cluster into less than half the
// plot height, the range is cut so the cluster fills just over half, and the spare room goes to the sides where
// the outliers lie. Values outside the range are drawn at the plot edge by the chart.
export function yDomain(values) {
  const v = [...values].sort((a, b) => a - b);
  let lo = v[0];
  let hi = v[v.length - 1];
  const c0 = quantile(v, 0.1);
  const c1 = quantile(v, 0.9);
  const cs = c1 - c0;
  // Padding of 3% a side is added below, so the cluster must fill 0.5 * 1.06 of the unpadded range.
  if (cs > 0 && cs / ((hi - lo) * 1.06) < 0.5) {
    const room = cs * (1 / 0.53 - 1) * 0.999;
    const needLo = c0 - lo;
    const needHi = hi - c1;
    let takeLo = Math.min(needLo, (room * needLo) / (needLo + needHi));
    let takeHi = Math.min(needHi, room - takeLo);
    takeLo = Math.min(needLo, room - takeHi);
    lo = c0 - takeLo;
    hi = c1 + takeHi;
  }
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  }
  const pad = (hi - lo) * 0.03;
  return { lo: lo - pad, hi: hi + pad };
}

// The time range of a set of chart groups, padded, so every chart of one company can share it.
export function xDomain(groups) {
  const xs = groups.flatMap((g) => g.points.flatMap((p) => [p.x0, ...(p.x1 == null ? [] : [p.x1])]));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const pad = Math.max((x1 - x0) * 0.02, 15 * 86400000);
  return [x0 - pad, x1 + pad];
}

// One tick per fiscal year: a boundary at each year end inside [x0, x1], and the year's label centred on the part
// of the year that is in range.
export function fiscalTicks(ticker, x0, x1) {
  const y0 = new Date(x0).getUTCFullYear() - 2;
  const y1 = new Date(x1).getUTCFullYear() + 2;
  const years = [];
  for (let fy = y0; fy <= y1; fy++) {
    const start = fiscalYearEnd(ticker, fy - 1);
    const end = fiscalYearEnd(ticker, fy);
    if (end <= x0 || start >= x1) continue;
    years.push({ fy, start: Math.max(start, x0), end: Math.min(end, x1), boundary: end < x1 ? end : null });
  }
  return years;
}

// Everything the y axis of one chart needs: the scale, the plotted range (axis units), the ticks and their labels.
// Unresolved statements have no reported figure on the chart, so only their guided range counts.
export const plotsReported = (p) => p.rep != null && p.x1 != null && p.status !== "unresolved";
export function yAxis(group) {
  const scale = scaleFor(group);
  const T = scale === "log" ? Math.log10 : (v) => v;
  const dom = yDomain(group.points.flatMap((p) => [p.lo, p.hi, ...(plotsReported(p) ? [p.rep] : [])]).map(T));
  const ticks = scale === "log" ? logTicks(10 ** dom.lo, 10 ** dom.hi) : niceTicks(dom.lo, dom.hi);
  return { scale, T, dom, ticks, labels: ticks.map((v) => formatTick(v, group.family)) };
}

// The widest tick label, in characters, across a set of charts, so they can share one left gutter.
export function gutterChars(groups) {
  return Math.max(...groups.map((g) => Math.max(...yAxis(g).labels.map((s) => s.length))));
}
