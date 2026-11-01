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
      <CompanyFinder
        companies={companies}
        head={
          <>
            <h1>What companies guided, and what happened next</h1>
            <p className="lede">
              Guidance from 8-K earnings releases, matched to what was reported, with the filings to check.
            </p>
          </>
        }
      >
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
          <p className="record-line small" data-testid="headline">
            <b data-stat="rows">{fmt(s.rows)}</b> statements, <b data-stat="resolved">{fmt(s.resolved)}</b> resolved,{" "}
            <b data-stat="met">{fmt(s.met)}</b> met, <b data-stat="missed">{fmt(s.missed)}</b> missed,{" "}
            <b data-stat="never">{fmt(s.neverAcknowledged)}</b> never acknowledged
          </p>
      </CompanyFinder>

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

      <section id="request" className="band" aria-labelledby="request-h">
        <h2 id="request-h">Request a company</h2>
        <p style={{ margin: "var(--s1) 0 var(--s3)", maxWidth: 640 }}>
          Not here yet? Request it and we build the record.
        </p>
        <RequestForm />
      </section>
    </div>
  );
}
