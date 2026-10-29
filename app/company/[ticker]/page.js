import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyRows, summarise, uniqueSorted } from "../../lib/data";
import { formatGuided, formatValue } from "../../lib/format";
import { StatusBadge, DirectionText } from "../../components/StatusBadge";

export async function generateMetadata({ params }) {
  const { ticker } = await params;
  const rows = getCompanyRows(ticker);
  return { title: rows.length ? `${rows[0].company} (${rows[0].ticker})` : "Not found" };
}

const one = (v) => (Array.isArray(v) ? v[0] : v);

export default async function CompanyPage({ params, searchParams }) {
  const { ticker } = await params;
  const sp = await searchParams;
  const all = getCompanyRows(ticker);
  if (all.length === 0) notFound();

  const metrics = uniqueSorted(all.map((r) => r.metric));
  const years = uniqueSorted(all.map((r) => r.fiscalYear));
  const metric = metrics.includes(one(sp?.metric)) ? one(sp.metric) : "";
  const fy = years.includes(one(sp?.fy)) ? one(sp.fy) : "";
  const rows = all.filter((r) => (!metric || r.metric === metric) && (!fy || r.fiscalYear === fy));
  const s = summarise(all);
  const name = all[0].company;

  return (
    <div className="stack">
      <section>
        <p style={{ margin: "0 0 8px" }}><Link href="/">All companies</Link></p>
        <h1>{name} <span className="mono" style={{ color: "var(--faint)" }}>{all[0].ticker}</span></h1>
        <p style={{ marginTop: 12, maxWidth: 760 }} data-testid="summary">
          {s.rows} rows. {s.resolved} resolved: {s.met} met and {s.missed} missed
          ({s.missedWorse} worse than guided, {s.missedBetter} better). {s.acknowledged} acknowledged in a later filing.
        </p>
      </section>

      <section className="card">
        <form method="get" className="fields fields-3" style={{ alignItems: "end" }} aria-label="Filters">
          <div>
            <label className="label" htmlFor="f-metric">Metric</label>
            <select id="f-metric" name="metric" className="input" defaultValue={metric}>
              <option value="">All metrics</option>
              {metrics.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-fy">Fiscal year</label>
            <select id="f-fy" name="fy" className="input" defaultValue={fy}>
              <option value="">All years</option>
              {years.map((y) => (
                <option key={y} value={y}>FY{y}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="submit" className="btn">Apply filters</button>
            {(metric || fy) && <Link href={`/company/${all[0].ticker}`}>Clear</Link>}
          </div>
        </form>
      </section>

      <section className="card">
        <p style={{ margin: "0 0 12px" }} data-testid="row-count" aria-live="polite">
          Showing {rows.length} of {all.length} rows
        </p>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Basis</th>
                <th>Period</th>
                <th>Guided range</th>
                <th>Stated</th>
                <th>Reported</th>
                <th>Outcome date</th>
                <th>Status</th>
                <th>Direction</th>
                <th>Acknowledged</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} data-row>
                  <td><Link href={`/row/${r.id}`}>{r.metricBase}</Link></td>
                  <td>{r.basis}</td>
                  <td className="nowrap">{r.period}</td>
                  <td className="nowrap">{formatGuided(r.low, r.high, r.unit)}</td>
                  <td className="nowrap mono">{r.statedAt}</td>
                  <td className="nowrap">{r.reported == null ? <span style={{ color: "var(--faint)" }}>none yet</span> : formatValue(r.reported, r.unit)}</td>
                  <td className="nowrap mono">{r.reportedAt || ""}</td>
                  <td><StatusBadge status={r.status} direction={r.direction} /></td>
                  <td><DirectionText direction={r.direction} /></td>
                  <td>{r.acknowledged ? "yes" : "no"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p>No rows match these filters.</p>}
      </section>
    </div>
  );
}
