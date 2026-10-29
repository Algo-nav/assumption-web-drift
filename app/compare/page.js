import { getRow, getAllRows, compareIndex } from "../lib/data";
import { formatGuided, formatValue } from "../lib/format";
import { StatusBadge } from "../components/StatusBadge";
import Excerpt from "../components/Excerpt";
import ComparePicker from "../components/ComparePicker";
import Link from "next/link";

export const metadata = { title: "Compare" };

const one = (v) => (Array.isArray(v) ? v[0] : v);

function pick(t, m, period, i) {
  const list = getAllRows()
    .filter((r) => r.ticker === t && r.metric === m && r.period === period)
    .sort((x, y) => x.statedAt.localeCompare(y.statedAt) || x.id.localeCompare(y.id));
  return { row: list[i] || list[0] || null, count: list.length };
}

function Side({ row, count }) {
  if (!row) return <div className="card">No row for this period.</div>;
  return (
    <div className="card stack" style={{ minWidth: 0 }} data-compare-side>
      <div>
        <h2>{row.period}</h2>
        <p style={{ margin: "4px 0 0" }}>
          <StatusBadge status={row.status} direction={row.direction} />
          {row.direction ? <span> {row.direction} than guided</span> : null}
        </p>
      </div>
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
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--faint)" }}>
          {count} statements exist for this period. This is the one stated {row.statedAt}.
        </p>
      ) : null}
      <div>
        <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>Guidance</h3>
        <Excerpt evidence={row.guidance} />
      </div>
      <div>
        <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>Outcome</h3>
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

  return (
    <div className="stack">
      <section>
        <h1>Compare two periods</h1>
        <p style={{ marginTop: 12, maxWidth: 680 }}>
          Pick a company, a metric and two periods. You get both guidance rows side by side, with the
          sentences and the outcomes.
        </p>
      </section>
      <section className="card">
        <ComparePicker index={index} initial={{ t, m, a, b, ai, bi }} />
      </section>
      {ready ? (
        <section className="pair" aria-label="Comparison">
          <Side {...left} />
          <Side {...right} />
        </section>
      ) : null}
    </div>
  );
}
