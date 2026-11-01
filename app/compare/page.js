import { getAllRows, compareIndex, getCompanyRows } from "../lib/data";
import { formatGuided, formatValue, describeRow } from "../lib/format";
import { chartGroups } from "../lib/chart";
import { StatusBadge } from "../components/StatusBadge";
import Excerpt from "../components/Excerpt";
import ComparePicker from "../components/ComparePicker";
import Chart, { ChartKey } from "../components/Chart";
import Link from "next/link";

export const metadata = { title: "Compare" };

const one = (v) => (Array.isArray(v) ? v[0] : v);

function pick(t, m, period, i) {
  const list = getAllRows()
    .filter((r) => r.ticker === t && r.metric === m && r.period === period)
    .sort((x, y) => x.statedAt.localeCompare(y.statedAt) || x.id.localeCompare(y.id));
  return { row: list[i] || list[0] || null, count: list.length };
}

function Side({ row, count, letter }) {
  if (!row) return <div className="card">There is no statement for this period.</div>;
  return (
    <div className="card stack-tight" data-compare-side>
      <div>
        <h2><span className="mono faint">{letter}</span> {row.period}</h2>
        <p className="small" style={{ margin: "var(--s1) 0 0" }}>
          <StatusBadge status={row.status} direction={row.direction} />
          {row.direction ? <span> {row.direction} than guided</span> : null}
        </p>
      </div>
      <p style={{ margin: 0, color: "var(--ink)" }}>{describeRow(row)}</p>
      <dl className="facts">
        <dt>Guided</dt>
        <dd>{formatGuided(row.low, row.high, row.unit)}</dd>
        <dt>Stated</dt>
        <dd className="mono">{row.statedAt}</dd>
        <dt>Reported</dt>
        <dd>{row.reported == null ? "none yet" : formatValue(row.reported, row.unit)}</dd>
        <dt>Outcome date</dt>
        <dd className="mono">{row.reportedAt || "none"}</dd>
        <dt>Row</dt>
        <dd><Link href={`/row/${row.id}`} className="mono">{row.id}</Link></dd>
      </dl>
      {count > 1 ? (
        <p className="small faint" style={{ margin: 0 }}>
          {count} statements exist for this period. This is the one stated <span className="mono">{row.statedAt}</span>.
        </p>
      ) : null}
      <div>
        <h3 style={{ marginBottom: "var(--s1)" }}>Guidance</h3>
        <Excerpt evidence={row.guidance} />
      </div>
      <div>
        <h3 style={{ marginBottom: "var(--s1)" }}>Outcome</h3>
        {row.outcome ? <Excerpt evidence={row.outcome} /> : <p style={{ margin: 0 }}>No filing has reported this figure yet.</p>}
      </div>
    </div>
  );
}

export default async function ComparePage({ searchParams }) {
  const sp = await searchParams;
  const t = one(sp?.t);
  const m = one(sp?.m);
  const a = one(sp?.a);
  const b = one(sp?.b);
  const ai = Number(one(sp?.ai)) || 0;
  const bi = Number(one(sp?.bi)) || 0;
  const index = compareIndex();
  const ready = t && m && a && b && index[t]?.metrics[m]?.[a] && index[t].metrics[m][b];
  const left = ready ? pick(t, m, a, ai) : null;
  const right = ready ? pick(t, m, b, bi) : null;

  // The chart for this metric, with the two chosen statements marked A and B.
  const marks = {};
  if (left?.row) marks[left.row.id] = "A";
  if (right?.row) marks[right.row.id] = "B";
  const groups = ready
    ? chartGroups(getCompanyRows(t).filter((r) => r.metric === m)).filter((g) => g.points.some((p) => marks[p.id]))
    : [];

  return (
    <div className="stack">
      <section>
        <h1>Compare two periods</h1>
        <p className="lede">
          Pick a company, a metric and two periods. You get the metric over time with both statements marked,
          then the two rows side by side.
        </p>
      </section>
      <section className="card">
        <ComparePicker index={index} initial={{ t, m, a, b, ai, bi }} />
      </section>
      {ready ? (
        <>
          {groups.length > 0 ? (
            <section aria-label="Metric over time" className="stack-tight">
              <ChartKey />
              <div className="charts">
                {groups.map((g) => <Chart key={g.key} group={g} highlight={marks} />)}
              </div>
            </section>
          ) : null}
          <section className="pair" aria-label="Comparison">
            <Side {...left} letter="A" />
            <Side {...right} letter="B" />
          </section>
        </>
      ) : (
        <div className="card empty">
          <h2>Nothing to compare yet</h2>
          <p style={{ margin: 0 }}>
            {t || m || a || b
              ? "That combination has no statements. Pick a period from the lists above and press Compare."
              : "Choose a company, a metric and two periods above, then press Compare."}
          </p>
        </div>
      )}
    </div>
  );
}
