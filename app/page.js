import Link from "next/link";
import { getAllRows, getCompanies, summarise, shortName } from "./lib/data";
import { describeRow, formatDate } from "./lib/format";
import CompanyFinder from "./components/CompanyFinder";
import RequestForm from "./components/RequestForm";
import Excerpt from "./components/Excerpt";
import { StatusBadge } from "./components/StatusBadge";

// The worked example for "How to read a row": a real acknowledged row, the one with the shortest quotes.
function exampleRow(rows) {
  const len = (r) => [r.guidance, r.outcome, r.acknowledgement].reduce((n, e) => n + (e ? e.excerpt.length : 0), 0);
  return rows
    .filter((r) => r.acknowledgement && r.outcome && r.guidance)
    .sort((a, b) => len(a) - len(b) || a.id.localeCompare(b.id))[0];
}

export default function Home() {
  const rows = getAllRows();
  const s = summarise(rows);
  const companies = getCompanies();
  const pct = s.neverAcknowledgedShare == null ? "n/a" : `${(s.neverAcknowledgedShare * 100).toFixed(1)}%`;
  const fmt = (n) => n.toLocaleString("en-US");

  const worseNever = rows.filter((r) => r.status === "missed" && r.direction === "worse" && !r.acknowledged).length;
  const ackTickers = [...new Set(rows.filter((r) => r.acknowledged).map((r) => r.ticker))];
  const ackWho =
    ackTickers.length === 1
      ? `all ${shortName(companies.find((c) => c.ticker === ackTickers[0]).name)}`
      : `across ${ackTickers.length} companies`;
  const ackHref = ackTickers.length === 1 ? `/company/${ackTickers[0]}?status=acknowledged` : "/#companies";
  const example = exampleRow(rows);

  return (
    <div className="stack">
      <section className="hero">
        <h1>What companies guided, and what happened next</h1>
        <p className="lede">
          Every number a company gave in an 8-K earnings release about its own future, set against the figure it
          reported later, with the filings to check.
        </p>
        <CompanyFinder companies={companies}>
          <div className="tiles" data-testid="tiles">
            <Link href="/misses" className="tile" data-tile="worse-never">
              <b>{fmt(worseNever)}</b>
              <span>worse-side misses never acknowledged</span>
            </Link>
            <Link href={ackHref} className="tile" data-tile="acknowledgements">
              <b>{fmt(s.acknowledged)}</b>
              <span>acknowledgements, {ackWho}</span>
            </Link>
            <Link href="/#companies" className="tile" data-tile="statements">
              <b>{fmt(s.rows)}</b>
              <span>statements across {companies.length} companies</span>
            </Link>
          </div>
        </CompanyFinder>
      </section>

      {example ? (
        <details className="panel" id="how-to-read">
          <summary>How to read a row</summary>
          <div className="panel-body stack-tight">
            <p style={{ margin: "var(--s2) 0 0", maxWidth: 640 }}>
              A row is one number a company guided, matched to what it reported. Here is a real one.
            </p>
            <div className="card">
              <h3>{example.company}, {example.metric}, {example.period}</h3>
              <p style={{ margin: "var(--s1) 0 0" }} className="small">
                <StatusBadge status={example.status} direction={example.direction} />{" "}
                {example.direction ? `${example.direction} than guided` : null}
                {example.acknowledged ? `, acknowledged ${formatDate(example.acknowledgedAt)}` : null}
              </p>
              <p style={{ margin: "var(--s2) 0 0", color: "var(--ink)" }}>{describeRow(example)}</p>
            </div>
            <div className="fields fields-3">
              <div className="card">
                <h3 style={{ marginBottom: "var(--s1)" }}>1. The guidance</h3>
                <Excerpt evidence={example.guidance} />
              </div>
              <div className="card">
                <h3 style={{ marginBottom: "var(--s1)" }}>2. The outcome</h3>
                <Excerpt evidence={example.outcome} />
              </div>
              <div className="card">
                <h3 style={{ marginBottom: "var(--s1)" }}>3. The acknowledgement</h3>
                <Excerpt evidence={example.acknowledgement} />
              </div>
            </div>
            <ul className="small" style={{ margin: 0, paddingLeft: "var(--s3)" }}>
              <li><b>met</b>: the reported figure landed inside the guided range.</li>
              <li><b>missed</b>: it landed outside. A beat counts as a miss, so <b>direction</b> says whether the miss was better or worse than guided.</li>
              <li><b>unresolved</b>: no filing has reported the figure yet.</li>
              <li><b>acknowledged</b>: a later filing refers to the guided figure after the outcome. The test is strict, so it is rare.</li>
            </ul>
            <p className="small faint" style={{ margin: 0 }}>
              The <Link href="/methodology">methodology</Link> has the full rules.
            </p>
          </div>
        </details>
      ) : null}

      <section aria-labelledby="numbers">
        <div className="section-head">
          <h2 id="numbers">The record in full</h2>
        </div>
        <div className="stat-grid" data-testid="headline">
          <div className="stat"><b data-stat="rows">{fmt(s.rows)}</b><span>rows</span></div>
          <div className="stat"><b data-stat="resolved">{fmt(s.resolved)}</b><span>resolved (met or missed)</span></div>
          <div className="stat"><b data-stat="met">{fmt(s.met)}</b><span>met</span></div>
          <div className="stat"><b data-stat="missed">{fmt(s.missed)}</b><span>missed</span></div>
          <div className="stat"><b data-stat="worse">{fmt(s.missedWorse)}</b><span>missed, worse than guided</span></div>
          <div className="stat"><b data-stat="better">{fmt(s.missedBetter)}</b><span>missed, better than guided</span></div>
          <div className="stat"><b data-stat="acknowledged">{fmt(s.acknowledged)}</b><span>acknowledged in a later filing</span></div>
          <div className="stat">
            <b data-stat="never">{pct}</b>
            <span>of misses never acknowledged ({fmt(s.neverAcknowledged)} of {fmt(s.missed)})</span>
          </div>
        </div>
        <p className="small faint" style={{ marginTop: "var(--s2)", maxWidth: 640 }}>
          Counted from the {fmt(s.rows)} rows in the release file. A beat counts as a miss, so better and worse
          are split out. The methodology page explains what acknowledged means.
        </p>
      </section>

      <section id="request" aria-labelledby="request-h" style={{ borderTop: "1px solid var(--line)", paddingTop: "var(--s4)", scrollMarginTop: "var(--s2)" }}>
        <h2 id="request-h">Request a company</h2>
        <p style={{ margin: "var(--s1) 0 var(--s3)", maxWidth: 640 }}>
          Not here yet? Request it and we build the record.
        </p>
        <RequestForm />
      </section>
    </div>
  );
}
