import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyRows, getSector, shortName, summarise, uniqueSorted } from "../../lib/data";
import { formatGuided, formatValue } from "../../lib/format";
import { chartGroups } from "../../lib/chart";
import { StatusBadge, DirectionText } from "../../components/StatusBadge";
import DirectionBar from "../../components/DirectionBar";
import Chart, { ChartKey } from "../../components/Chart";

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
  const rows = all.filter(
    (r) => (!metric || r.metricBase === metric) && (!fy || r.fiscalYear === fy) && (!statusFn || statusFn(r))
  );
  const s = summarise(all);
  const name = all[0].company;
  const short = shortName(name);
  const since = all[0].statedAt.slice(0, 4);
  const sector = getSector(tk);

  // A toggle link: clicking the active pill clears that filter.
  const href = (next) => {
    const q = new URLSearchParams();
    const cur = { metric, fy, status, ...next };
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

  const groups = chartGroups(all.filter((r) => !metric || r.metricBase === metric))
    .filter((g) => g.resolved >= 3)
    .sort((a, b) => b.resolved - a.resolved || a.title.localeCompare(b.title));
  const shownCharts = groups.slice(0, VISIBLE_CHARTS);
  const moreCharts = groups.slice(VISIBLE_CHARTS);

  const summary = [
    `${short} guided ${s.rows} times since ${since}.`,
    `${s.resolved} resolved: ${s.met} met, ${s.missed} missed, ${s.missedWorse} worse.`,
    s.acknowledged === 0 ? "None acknowledged." : `${s.acknowledged} acknowledged.`,
  ].join(" ");

  return (
    <div className="stack">
      <section>
        <p className="small" style={{ margin: "0 0 var(--s1)" }}><Link href="/">All companies</Link></p>
        <h1>{name}</h1>
        <p className="small faint" style={{ margin: "var(--s1) 0 0" }}>
          <span className="mono">{tk}</span>
          {sector ? <> &middot; {sector}</> : null}
        </p>
        <p className="lede" data-testid="summary">{summary}</p>
        <div style={{ marginTop: "var(--s2)", maxWidth: 480 }}>
          <DirectionBar better={s.missedBetter} worse={s.missedWorse} legend />
        </div>
      </section>

      {groups.length > 0 ? (
        <section aria-labelledby="charts-h" className="stack-tight">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <h2 id="charts-h">{metric ? `${metric} over time` : "Guidance over time"}</h2>
          </div>
          <ChartKey />
          <div className="charts" data-testid="charts">
            {shownCharts.map((g) => <Chart key={g.key} group={g} />)}
          </div>
          {moreCharts.length > 0 ? (
            <details className="panel">
              <summary>{moreCharts.length} more chart{moreCharts.length === 1 ? "" : "s"}</summary>
              <div className="panel-body">
                <div className="charts" style={{ marginTop: "var(--s2)" }}>
                  {moreCharts.map((g) => <Chart key={g.key} group={g} />)}
                </div>
              </div>
            </details>
          ) : null}
          <p className="small faint" style={{ margin: 0 }}>
            Charts follow the metric filter. Metrics with fewer than three resolved statements show in the table only.
          </p>
        </section>
      ) : null}

      <section className="card filters" aria-label="Filters">
        <div className="pill-group" role="group" aria-label="Metric">
          <span className="label" aria-hidden="true">Metric</span>
          {metrics.map((m) => <Pill key={m} group="metric" value={m}>{m}</Pill>)}
        </div>
        <div className="pill-group" role="group" aria-label="Fiscal year">
          <span className="label" aria-hidden="true">Fiscal year</span>
          {years.map((y) => <Pill key={y} group="fy" value={y}>FY{y}</Pill>)}
        </div>
        <div className="pill-group" role="group" aria-label="Status">
          <span className="label" aria-hidden="true">Status</span>
          {pills.map(([k, label]) => <Pill key={k} group="status" value={k}>{label}</Pill>)}
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <p style={{ margin: 0, color: "var(--ink)" }} data-testid="row-count" aria-live="polite">
            Showing {rows.length} of {all.length} rows
          </p>
          {(metric || fy || status) && <Link href={`/company/${tk}`} scroll={false} className="small">Clear filters</Link>}
        </div>
        {rows.length === 0 ? (
          <div className="empty">
            <h2>No statements match</h2>
            <p style={{ margin: "0 0 var(--s2)" }}>Nothing from {short} fits all of these filters at once. Clear one and try again.</p>
            <Link href={`/company/${tk}`} className="btn btn-sm">Clear filters</Link>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data">
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
                  <th>Direction</th>
                  <th>Acknowledged</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} data-row>
                    <td className="nowrap"><Link href={`/row/${r.id}`}>{r.metricBase}</Link></td>
                    <td className="nowrap">{r.basis}</td>
                    <td className="nowrap mono">{r.period}</td>
                    <td className="num">{formatGuided(r.low, r.high, r.unit)}</td>
                    <td className="nowrap mono">{r.statedAt}</td>
                    <td className="num">{r.reported == null ? <span className="faint">none yet</span> : formatValue(r.reported, r.unit)}</td>
                    <td className="nowrap mono">{r.reportedAt || ""}</td>
                    <td><StatusBadge status={r.status} direction={r.direction} /></td>
                    <td><DirectionText direction={r.direction} /></td>
                    <td>{r.acknowledged ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
