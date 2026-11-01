import Link from "next/link";
import { getAllRows, uniqueSorted, shortName } from "../lib/data";
import { formatGuided, formatValue, formatBy } from "../lib/format";

export const metadata = { title: "Misses" };

const one = (v) => (Array.isArray(v) ? v[0] : v);

const COLUMNS = [
  ["company", "Company"],
  ["metric", "Metric"],
  ["period", "Period"],
  ["guided", "Guided range", "num"],
  ["reported", "Reported", "num"],
  ["by", "By", "num", true],
  ["pct", "Beyond the guide", "num", true],
  ["stated", "Stated", "", true],
  ["ack", "Acknowledged"],
];

export default async function MissesPage({ searchParams }) {
  const sp = await searchParams;
  const all = getAllRows().filter((r) => r.status === "missed");
  const side = one(sp?.side) === "better" ? "better" : "worse";
  const ofSide = all.filter((r) => r.direction === side);
  const counts = { worse: all.filter((r) => r.direction === "worse").length, better: all.filter((r) => r.direction === "better").length };

  const tickers = uniqueSorted(ofSide.map((r) => r.ticker));
  const metrics = uniqueSorted(ofSide.map((r) => r.metricBase));
  const company = tickers.includes(one(sp?.company)) ? one(sp.company) : "";
  const metric = metrics.includes(one(sp?.metric)) ? one(sp.metric) : "";
  // Percent-type metrics (percent or basis points) sort by points by default, everything else by percent.
  const percentType = Boolean(metric) && ofSide.filter((r) => r.metricBase === metric).every((r) => r.percentType);
  const defaultSort = percentType ? "by" : "pct";
  const explicit = ["by", "pct", "stated"].includes(one(sp?.sort)) ? one(sp.sort) : "";
  const sort = explicit || defaultSort;
  const dir = one(sp?.dir) === "asc" ? "asc" : "desc";

  const rows = ofSide
    .filter((r) => (!company || r.ticker === company) && (!metric || r.metricBase === metric))
    .sort((x, y) => {
      const sign = dir === "asc" ? 1 : -1;
      if (sort === "stated") return sign * x.statedAt.localeCompare(y.statedAt) || x.id.localeCompare(y.id);
      // Rows with no value (a bound of zero has no percent) always sort last.
      const k = sort === "by" ? "beyondBase" : "beyondPct";
      if (x[k] == null || y[k] == null) return (x[k] == null) - (y[k] == null) || x.id.localeCompare(y.id);
      return sign * (x[k] - y[k]) || x.id.localeCompare(y.id);
    });

  const href = (next) => {
    const cur = { side, company, metric, explicit, dir, ...next };
    const q = new URLSearchParams();
    if (cur.side !== "worse") q.set("side", cur.side);
    if (cur.company) q.set("company", cur.company);
    if (cur.metric) q.set("metric", cur.metric);
    if (cur.explicit) {
      q.set("sort", cur.explicit);
      q.set("dir", cur.dir);
    }
    const qs = q.toString();
    return `/misses${qs ? `?${qs}` : ""}`;
  };
  const Pill = ({ group, value, active, children, title }) => (
    <Link href={href({ [group]: active ? "" : value })} scroll={false} prefetch={false} className="pill" aria-current={active ? "true" : undefined} title={title}>
      {children}
    </Link>
  );
  const sortHref = (key) => href({ explicit: key, dir: sort === key && dir === "desc" ? "asc" : "desc" });
  const names = Object.fromEntries(all.map((r) => [r.ticker, r.company]));

  return (
    <div className="stack">
      <section>
        <h1>Misses</h1>
        <p className="lede">
          Every guided number that landed outside its range, across all companies. Worse-side misses are the ones
          that cost the reader. A beat also counts as a miss, so better-side misses are listed too.
        </p>
      </section>

      <section className="card filters" aria-label="Filters">
        <div className="pill-group" role="group" aria-label="Side">
          <span className="label" aria-hidden="true">Side</span>
          <Link href={href({ side: "worse", company: "", metric: "" })} scroll={false} prefetch={false} className="pill" aria-current={side === "worse" ? "true" : undefined}>
            Worse than guided ({counts.worse})
          </Link>
          <Link href={href({ side: "better", company: "", metric: "" })} scroll={false} prefetch={false} className="pill" aria-current={side === "better" ? "true" : undefined}>
            Better than guided ({counts.better})
          </Link>
        </div>
        <div className="pill-group" role="group" aria-label="Company">
          <span className="label" aria-hidden="true">Company</span>
          {tickers.map((t) => <Pill key={t} group="company" value={t} active={company === t} title={names[t]}>{t}</Pill>)}
        </div>
        <div className="pill-group" role="group" aria-label="Metric">
          <span className="label" aria-hidden="true">Metric</span>
          {metrics.map((m) => <Pill key={m} group="metric" value={m} active={metric === m}>{m}</Pill>)}
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <p style={{ margin: 0, color: "var(--ink)" }} data-testid="row-count" aria-live="polite">
            Showing {rows.length} of {ofSide.length} {side}-side misses
          </p>
          {(company || metric) && <Link href={href({ company: "", metric: "" })} scroll={false} className="small">Clear filters</Link>}
        </div>
        {rows.length === 0 ? (
          <div className="empty">
            <h2>No misses match</h2>
            <p style={{ margin: "0 0 var(--s2)" }}>No {side}-side miss fits both filters. Clear one and try again.</p>
            <Link href={href({ company: "", metric: "" })} className="btn btn-sm">Clear filters</Link>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data misses">
              <colgroup>
                {[100, 136, 92, 150, 104, 100, 124, 88, 106].map((w, k) => <col key={k} style={{ width: w }} />)}
              </colgroup>
              <thead>
                <tr>
                  {COLUMNS.map(([key, label, cls, sortable]) => (
                    <th
                      key={key}
                      className={cls}
                      aria-sort={sortable && sort === key ? (dir === "asc" ? "ascending" : "descending") : undefined}
                    >
                      {sortable ? (
                        <Link href={sortHref(key)} scroll={false} prefetch={false} className="sort">
                          {label}
                          {sort === key ? (dir === "asc" ? " \u2191" : " \u2193") : ""}
                        </Link>
                      ) : (
                        label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} data-row>
                    <td className="nowrap" title={r.company}>{shortName(r.company)}</td>
                    <td className="nowrap" title={r.metric}><Link href={`/row/${r.id}`}>{r.metric}</Link></td>
                    <td className="nowrap mono">{r.period}</td>
                    <td className="num">{formatGuided(r.low, r.high, r.unit)}</td>
                    <td className="num">{formatValue(r.reported, r.unit)}</td>
                    <td className="num" data-by={r.beyondBase ?? ""} title={formatBy(r.beyondAbs, r.unit)}>
                      {r.beyondAbs == null ? <span className="faint">n/a</span> : formatBy(r.beyondAbs, r.unit)}
                    </td>
                    <td className={`num${side === "worse" ? " text-worse" : ""}`} data-pct={r.beyondPct ?? ""}>
                      {r.beyondPct == null ? <span className="faint">n/a</span> : `${r.beyondPct.toFixed(1)}%`}
                    </td>
                    <td className="nowrap mono">{r.statedAt}</td>
                    <td>{r.acknowledged ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {sort === "by" && !metric && rows.length > 0 ? (
          <p className="small faint" style={{ margin: "var(--s2) 0 0" }}>
            By is in each metric&rsquo;s own unit, so it only compares like with like. Pick a metric to sort by it.
          </p>
        ) : null}
      </section>
    </div>
  );
}
