import Link from "next/link";
import TableScroll from "../../components/TableScroll";
import { notFound } from "next/navigation";
import { getCompanyRows, getSector, shortName, summarise, uniqueSorted } from "../../lib/data";
import { formatGuidedShort, formatValueShort } from "../../lib/format";
import { chartGroups, xDomain, gutterChars } from "../../lib/chart";
import { StatusBadge } from "../../components/StatusBadge";
import DirectionBar from "../../components/DirectionBar";
import Chart, { ChartKey } from "../../components/Chart";
import Logo, { LOGO_PAGE } from "../../components/Logo";
import { logoRatio } from "../../lib/logos";
import { fiscalYearEndText } from "../../lib/fiscal-text";

export async function generateMetadata({ params }) {
  const { ticker } = await params;
  const rows = getCompanyRows(ticker);
  return { title: rows.length ? `${rows[0].company} (${rows[0].ticker})` : "Not found" };
}

const one = (v) => (Array.isArray(v) ? v[0] : v);

const STATUS_PILLS = [
  ["met", "Met", (r) => r.status === "met"],
  ["missed", "Missed", (r) => r.status === "missed"],
  ["worse", "Missed, worse", (r) => r.status === "missed" && r.direction === "worse"],
  ["acknowledged", "Acknowledged", (r) => r.acknowledged],
  ["unresolved", "Unresolved", (r) => r.status === "unresolved"],
  ["withdrawn", "Withdrawn", (r) => r.status === "withdrawn"],
];

const VISIBLE_CHARTS = 4;
const OPEN_YEARS = 2;

export default async function CompanyPage({ params, searchParams }) {
  const { ticker } = await params;
  const sp = await searchParams;
  const all = getCompanyRows(ticker);
  if (all.length === 0) notFound();

  const tk = all[0].ticker;
  const metrics = uniqueSorted(all.map((r) => r.metricBase));
  const years = uniqueSorted(all.map((r) => r.fiscalYear));
  const pills = STATUS_PILLS.filter(([, , fn]) => all.some(fn));
  const metric = metrics.includes(one(sp?.metric)) ? one(sp.metric) : "";
  const fy = years.includes(one(sp?.fy)) ? one(sp.fy) : "";
  const status = pills.some(([k]) => k === one(sp?.status)) ? one(sp.status) : "";
  const statusFn = status ? pills.find(([k]) => k === status)[2] : null;
  // The rail is open unless the URL says otherwise, so a collapsed view can be linked to like any filter.
  const railOpen = one(sp?.rail) !== "0";
  const rows = all.filter(
    (r) => (!metric || r.metricBase === metric) && (!fy || r.fiscalYear === fy) && (!statusFn || statusFn(r))
  );
  // Fiscal years, newest first, each with its own filtered rows (newest statement first). The two newest are open.
  const groupsByYear = new Map();
  for (const r of [...rows].sort((x, y) => y.statedAt.localeCompare(x.statedAt) || x.id.localeCompare(y.id))) {
    const k = r.fiscalYear || "none";
    if (!groupsByYear.has(k)) groupsByYear.set(k, []);
    groupsByYear.get(k).push(r);
  }
  const byYear = [...groupsByYear.entries()].sort(([a], [b]) => (a === "none" ? -1 : b === "none" ? 1 : b.localeCompare(a)));
  const s = summarise(all);
  const name = all[0].company;
  const short = shortName(name);
  const since = all[0].statedAt.slice(0, 4);
  const sector = getSector(tk);

  // A toggle link: clicking the active pill clears that filter. The rail state rides along.
  const href = (next) => {
    const q = new URLSearchParams();
    const cur = { metric, fy, status, rail: railOpen ? "" : "0", ...next };
    for (const [k, v] of Object.entries(cur)) if (v) q.set(k, v);
    const qs = q.toString();
    return `/company/${tk}${qs ? `?${qs}` : ""}`;
  };
  const Pill = ({ group, value, children }) => {
    const active = (group === "metric" ? metric : group === "fy" ? fy : status) === value;
    return (
      <Link href={href({ [group]: active ? "" : value })} scroll={false} prefetch={false} className="pill" aria-current={active ? "true" : undefined}>
        {children}
      </Link>
    );
  };
  const filtered = Boolean(metric || fy || status);
  const clearHref = href({ metric: "", fy: "", status: "" });
  const statusLabel = status ? pills.find(([k]) => k === status)[1] : "";
  // What the collapsed strip counts, and names in its tooltip.
  const railOn = [
    ["Metric", metric],
    ["Status", statusLabel],
    ["Fiscal year", fy ? `FY${fy}` : ""],
  ].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);

  // The metric filter chooses which charts are drawn. Status and fiscal year do not remove points, because a
  // chart with holes in it stops showing the run of guidance over time: the points that do not match are dimmed.
  const groups = chartGroups(all.filter((r) => !metric || r.metricBase === metric))
    .filter((g) => g.resolved >= 3)
    .sort((a, b) => b.resolved - a.resolved || a.title.localeCompare(b.title));
  const shownCharts = groups.slice(0, VISIBLE_CHARTS);
  const moreCharts = groups.slice(VISIBLE_CHARTS);
  // One time range for every chart of this company, so the fiscal-year ticks line up across them.
  const chartX = groups.length ? xDomain(groups) : null;
  const gutter = groups.length ? gutterChars(groups) : null;
  const only = fy || status ? new Set(rows.map((r) => r.id)) : null;
  const plotted = groups.reduce((n, g) => n + g.points.length, 0);
  const plottedMatch = only ? groups.reduce((n, g) => n + g.points.filter((p) => only.has(p.id)).length, 0) : plotted;
  const dimLabels = [statusLabel, fy ? `FY${fy}` : ""].filter(Boolean).join(", ");

  const summary = [
    `${short} guided ${s.rows} times since ${since}.`,
    `${s.resolved} resolved: ${s.met} met, ${s.missed} missed, ${s.missedWorse} worse.`,
    s.acknowledged === 0 ? "None acknowledged." : `${s.acknowledged} acknowledged.`,
  ].join(" ");
  const fyEnd = fiscalYearEndText(tk);

  return (
    <div className="company">
      <section>
        <p className="crumb"><Link href="/">All companies</Link></p>
        <div className="company-head">
          <div className="company-title">
            <Logo ticker={tk} ratio={logoRatio(tk)} max={LOGO_PAGE} />
            <h1>{name}</h1>
          </div>
          <Link href={`/compare?t=${encodeURIComponent(tk)}`} className="btn ghost sm" data-testid="compare-with">
            Compare with…
          </Link>
        </div>
        <p className="company-meta mono" data-testid="company-meta">
          <span>{tk}</span>
          {sector ? <span>{sector}</span> : null}
          {fyEnd ? <span>{fyEnd}</span> : null}
        </p>
        <p className="lede" data-testid="summary">{summary}</p>
        <div className="company-bar">
          <DirectionBar better={s.missedBetter} worse={s.missedWorse} of={s.rows} legend />
        </div>
      </section>

      <div className={`split${railOpen ? "" : " collapsed"}`} data-testid="split" data-rail={railOpen ? "open" : "collapsed"}>
        <aside className="rail" aria-label="Filters">
          <div className="rail-top">
            <Link
              href={href({ rail: railOpen ? "0" : "" })}
              scroll={false}
              prefetch={false}
              className="rail-tog"
              aria-expanded={railOpen}
              aria-controls="rail-filters"
              aria-label={railOpen ? "Collapse filters" : "Expand filters"}
              data-testid="rail-toggle"
            >
              <i /><i /><i />
            </Link>
            {railOpen ? (
              <h2 className="rail-title">Filters</h2>
            ) : railOn.length > 0 ? (
              <span className="rail-count mono" data-testid="rail-count" title={railOn.join("; ")}>
                {railOn.length}
                <span className="sr-only"> filter{railOn.length === 1 ? "" : "s"} on: {railOn.join("; ")}</span>
              </span>
            ) : null}
          </div>
          <div id="rail-filters" className="rail-body" hidden={!railOpen}>
            <div className="rail-group" role="group" aria-label="Metric">
              <h3 className="rail-h" aria-hidden="true">Metric</h3>
              <div className="rail-pills">{metrics.map((m) => <Pill key={m} group="metric" value={m}>{m}</Pill>)}</div>
            </div>
            <div className="rail-group" role="group" aria-label="Status">
              <h3 className="rail-h" aria-hidden="true">Status</h3>
              <div className="rail-pills">{pills.map(([k, label]) => <Pill key={k} group="status" value={k}>{label}</Pill>)}</div>
            </div>
            <div className="rail-group" role="group" aria-label="Fiscal year">
              <h3 className="rail-h" aria-hidden="true">Fiscal year</h3>
              <div className="rail-pills years">{[...years].reverse().map((y) => <Pill key={y} group="fy" value={y}>FY{y}</Pill>)}</div>
            </div>
            {filtered ? <Link href={clearHref} scroll={false} className="rail-clear small">Clear filters</Link> : null}
          </div>
        </aside>

        <div className="split-main stack">
          {groups.length > 0 ? (
            <section aria-labelledby="charts-h" className="stack-tight">
              <div className="section-head">
                <h2 id="charts-h">{metric ? `${metric} over time` : "Guidance over time"}</h2>
                {only ? (
                  <p className="tag" data-testid="chart-filter" aria-live="polite">
                    {plottedMatch} of {plotted} plotted statements match {dimLabels}; the rest are dimmed.{" "}
                    <a href="#rows">{rows.length} row{rows.length === 1 ? "" : "s"} below</a>
                  </p>
                ) : null}
              </div>
              <ChartKey />
              <div className="charts" data-testid="charts">
                {shownCharts.map((g) => <Chart key={g.key} group={g} x={chartX} gutter={gutter} only={only} />)}
              </div>
              {moreCharts.length > 0 ? (
                <details className="panel">
                  <summary>{moreCharts.length} more chart{moreCharts.length === 1 ? "" : "s"}</summary>
                  <div className="panel-body">
                    <div className="charts">
                      {moreCharts.map((g) => <Chart key={g.key} group={g} x={chartX} gutter={gutter} only={only} />)}
                    </div>
                  </div>
                </details>
              ) : null}
              <p className="small faint">
                The metric filter chooses the charts; status and fiscal year dim the points that do not match.
                Metrics with fewer than three resolved statements show in the table only.
              </p>
            </section>
          ) : null}

          <section id="rows" className="rows" aria-label="Statements">
            <div className="section-head">
              <p data-testid="row-count" aria-live="polite">
                Showing {rows.length} of {all.length} rows
              </p>
              {filtered && <Link href={clearHref} scroll={false} className="small">Clear filters</Link>}
            </div>
            {rows.length === 0 ? (
              <div className="card empty">
                <h2>No statements match</h2>
                <p>Nothing from {short} fits all of these filters at once. Clear one and try again.</p>
                <Link href={clearHref} className="btn ghost sm">Clear filters</Link>
              </div>
            ) : (
              <div className="years">
                {byYear.map(([year, list], i) => (
                  <details key={year} className="year" open={i < OPEN_YEARS} data-year={year}>
                    <summary>
                      <span className="year-name">{year === "none" ? "Other" : `FY${year}`}</span>
                      <span className="year-count">{list.length} row{list.length === 1 ? "" : "s"}</span>
                    </summary>
                    <TableScroll>
                      <table className="data">
                        <colgroup>
                          {[132, 77, 79, 164, 86, 79, 94, 125, 100].map((w, k) => <col key={k} style={{ width: w }} />)}
                        </colgroup>
                        <thead>
                          <tr>
                            <th>Metric</th>
                            <th>Basis</th>
                            <th>Period</th>
                            <th className="num">Guided range</th>
                            <th>Stated</th>
                            <th className="num">Reported</th>
                            <th>Outcome date</th>
                            <th>Status</th>
                            <th>Acknowledged</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((r) => (
                            <tr key={r.id} data-row>
                              <td className="nowrap" title={r.metricBase}><Link href={`/row/${r.id}`}>{r.metricBase}</Link></td>
                              <td className="nowrap">{r.basis}</td>
                              <td className="nowrap mono">{r.period}</td>
                              <td className="num">{formatGuidedShort(r.low, r.high, r.unit)}</td>
                              <td className="nowrap mono">{r.statedAt}</td>
                              <td className="num">{r.reported == null ? <span className="faint">none yet</span> : formatValueShort(r.reported, r.unit)}</td>
                              <td className="nowrap mono">{r.reportedAt || ""}</td>
                              <td data-direction={r.direction || undefined}><StatusBadge status={r.status} direction={r.direction} joined /></td>
                              <td>{r.acknowledged ? <span className="status"><i className="sw ack" aria-hidden="true" />yes</span> : <span className="faint">no</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TableScroll>
                  </details>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
