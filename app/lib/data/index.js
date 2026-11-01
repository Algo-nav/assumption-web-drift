// In-memory dataset. Loaded once per server process; every page reads through these functions.
import { loadRawRecords } from "./source.js";
import { higherIsBetter, directionOf, side } from "./polarity.js";
import { SECTORS } from "./sectors.js";

const UNIT_TO_BASE = { "USD billions": 1e9, "USD millions": 1e6, "basis points": 0.01 };

const KEY = Symbol.for("assumption-drift.store");

function fiscalYear(period) {
  const m = /FY(\d{4})/.exec(period || "");
  return m ? m[1] : null;
}

// The basis is a suffix ("EPS non-GAAP") or a prefix ("GAAP gross margin"): both split to metric + basis.
// Metrics with no basis in the name get "n/a".
export function splitMetric(metric) {
  const m = /^(.*?)\s+(non-GAAP|GAAP)$/i.exec(metric) || /^(non-GAAP|GAAP)\s+(.*)$/i.exec(metric);
  if (!m) return { base: metric, basis: "n/a" };
  const suffix = /^(non-GAAP|GAAP)$/i.test(m[2]);
  return { base: suffix ? m[1] : m[2], basis: suffix ? m[2] : m[1] };
}

function evidence(e) {
  if (!e) return null;
  return {
    url: e.source_url,
    accession: e.accession_number,
    filingType: e.filing_type,
    filedAt: e.filed_at,
    excerpt: e.excerpt,
  };
}

function normalise(r) {
  const a = r.assumption;
  const { base, basis } = splitMetric(a.metric);
  const reported = r.outcome ? r.outcome.reported_value : null;
  const direction =
    r.status === "missed"
      ? directionOf(a.target_low, a.target_high, reported, higherIsBetter(a.metric))
      : null;
  // How far outside the guided range the reported figure landed, as a percent of the bound it crossed.
  // beyondAbs is the distance in the row's own unit; beyondBase puts it on one scale (dollars, or percentage
  // points with basis points divided by 100) so rows of the same metric sort together.
  let beyondPct = null;
  let beyondAbs = null;
  let beyondBase = null;
  if (r.status === "missed" && reported != null) {
    const sd = side(a.target_low, a.target_high, reported);
    const bound = sd === "above" ? (a.target_high ?? a.target_low) : sd === "below" ? (a.target_low ?? a.target_high) : null;
    if (bound != null) {
      beyondAbs = Math.abs(reported - bound);
      beyondBase = beyondAbs * (UNIT_TO_BASE[a.unit] ?? 1);
      if (bound) beyondPct = (beyondAbs / Math.abs(bound)) * 100;
    }
  }
  return {
    id: r.record_id,
    ticker: r.ticker,
    company: r.company,
    cik: r.cik,
    claim: r.claim,
    metric: a.metric,
    metricBase: base,
    basis,
    period: a.target_period,
    fiscalYear: fiscalYear(a.target_period),
    low: a.target_low,
    high: a.target_high,
    unit: a.unit,
    statedAt: a.stated_at,
    guidance: evidence(a.evidence),
    reported,
    reportedAt: r.outcome ? r.outcome.reported_at : null,
    outcome: r.outcome ? evidence(r.outcome.evidence) : null,
    status: r.status,
    direction,
    beyondPct,
    beyondAbs,
    beyondBase,
    percentType: a.unit === "percent" || a.unit === "basis points",
    acknowledged: Boolean(r.acknowledged_at),
    acknowledgedAt: r.acknowledged_at,
    acknowledgement: evidence(r.acknowledgement_evidence),
    daysToFalsifiable: r.days_to_falsifiable,
    daysToAcknowledged: r.days_to_acknowledged,
    reviewer: r.reviewer,
    reviewedAt: r.last_reviewed_at,
    // Not in the published file today. Shown on the row page if a later release adds it.
    reviewerNote: r.reviewer_note ?? null,
  };
}

function build() {
  const rows = loadRawRecords().map(normalise);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const byTicker = new Map();
  for (const r of rows) {
    if (!byTicker.has(r.ticker)) byTicker.set(r.ticker, []);
    byTicker.get(r.ticker).push(r);
  }
  for (const list of byTicker.values()) {
    list.sort((x, y) => x.statedAt.localeCompare(y.statedAt) || x.id.localeCompare(y.id));
  }
  return { rows, byId, byTicker };
}

function store() {
  if (!globalThis[KEY]) globalThis[KEY] = build();
  return globalThis[KEY];
}

export function getAllRows() {
  return store().rows;
}

export function getRow(id) {
  return store().byId.get(id) || null;
}

export function getCompanyRows(ticker) {
  return store().byTicker.get(String(ticker).toUpperCase()) || [];
}

export function getCompanies() {
  const { byTicker } = store();
  return [...byTicker.entries()]
    .map(([ticker, list]) => ({
      ticker,
      name: list[0].company,
      shortName: shortName(list[0].company),
      sector: SECTORS[ticker] || null,
      ...summarise(list),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// "Meta Platforms, Inc." -> "Meta Platforms", "The Home Depot, Inc." -> "Home Depot".
export function shortName(name) {
  return name
    .replace(/^The\s+/, "")
    .replace(/,?\s+(Inc\.?|Incorporated|Corporation|Corp\.?|Companies|Company|Co\.?|Ltd\.?|Group)$/i, "")
    .replace(/,?\s+(Inc\.?|Incorporated|Corporation|Corp\.?|Companies|Company|Co\.?|Ltd\.?)$/i, "");
}

export function getSector(ticker) {
  return SECTORS[String(ticker).toUpperCase()] || null;
}

// Fiscal period as a sortable number: "Q2 FY2024" -> 20242, "FY2024" -> 20245 (the year sorts after its quarters).
export function periodKey(p) {
  const m = /^(?:Q([1-4]) )?FY(\d{4})$/.exec(p || "");
  return m ? Number(m[2]) * 10 + (m[1] ? Number(m[1]) : 5) : 0;
}

// Previous and next statement for the same company and metric: by stated date, then period.
export function getNeighbours(row) {
  const list = getCompanyRows(row.ticker)
    .filter((r) => r.metric === row.metric)
    .sort((x, y) => x.statedAt.localeCompare(y.statedAt) || periodKey(x.period) - periodKey(y.period) || x.id.localeCompare(y.id));
  const i = list.findIndex((r) => r.id === row.id);
  return { prev: list[i - 1] || null, next: list[i + 1] || null, position: i + 1, total: list.length };
}

export function summarise(rows) {
  const count = (fn) => rows.reduce((n, r) => n + (fn(r) ? 1 : 0), 0);
  const met = count((r) => r.status === "met");
  const missed = count((r) => r.status === "missed");
  const missedWorse = count((r) => r.status === "missed" && r.direction === "worse");
  const missedBetter = count((r) => r.status === "missed" && r.direction === "better");
  const neverAcknowledged = count((r) => r.status === "missed" && !r.acknowledged);
  return {
    rows: rows.length,
    resolved: met + missed,
    met,
    missed,
    missedWorse,
    missedBetter,
    acknowledged: count((r) => r.acknowledged),
    neverAcknowledged,
    neverAcknowledgedShare: missed ? neverAcknowledged / missed : null,
  };
}

export function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

// Compact index for the compare picker: ticker -> metric -> period -> [{id, statedAt}].
export function compareIndex() {
  const out = {};
  for (const r of getAllRows()) {
    out[r.ticker] ??= { name: r.company, metrics: {} };
    const m = (out[r.ticker].metrics[r.metric] ??= {});
    (m[r.period] ??= []).push({ id: r.id, statedAt: r.statedAt });
  }
  for (const t of Object.values(out))
    for (const m of Object.values(t.metrics))
      for (const list of Object.values(m)) list.sort((a, b) => a.statedAt.localeCompare(b.statedAt) || a.id.localeCompare(b.id));
  return out;
}
