import Link from "next/link";
import { getAllRows, getCompanies, summarise, shortName } from "./lib/data";
import { describeRow, formatDate, formatGuidedShort, formatValueShort } from "./lib/format";
import CompanyFinder from "./components/CompanyFinder";
import RequestForm from "./components/RequestForm";
import Excerpt from "./components/Excerpt";
import UnitChart from "./components/UnitChart";
import { StatusBadge } from "./components/StatusBadge";
import { logoRatio } from "./lib/logos";

// The worked example for "How to read a row": a real acknowledged row, the one with the shortest quotes.
function exampleRow(rows) {
  const len = (r) => [r.guidance, r.outcome, r.acknowledgement].reduce((n, e) => n + (e ? e.excerpt.length : 0), 0);
  return rows
    .filter((r) => r.acknowledgement && r.outcome && r.guidance)
    .sort((a, b) => len(a) - len(b) || a.id.localeCompare(b.id))[0];
}

// The largest worse-side misses, in the order /misses shows them by default: by percent beyond the guided range,
// rows with no percent (a bound of zero) last.
function largestWorse(rows) {
  return rows
    .filter((r) => r.status === "missed" && r.direction === "worse")
    .sort((x, y) => {
      if (x.beyondPct == null || y.beyondPct == null) return (x.beyondPct == null) - (y.beyondPct == null) || x.id.localeCompare(y.id);
      return y.beyondPct - x.beyondPct || x.id.localeCompare(y.id);
    });
}

const FEED_ROWS = 4;

export default function Home() {
  const rows = getAllRows();
  const s = summarise(rows);
  const companies = getCompanies().map((c) => ({ ...c, logo: logoRatio(c.ticker) }));
  const fmt = (n) => n.toLocaleString("en-US");

  const ackTickers = [...new Set(rows.filter((r) => r.acknowledged).map((r) => r.ticker))];
  const ackWho =
    ackTickers.length === 1
      ? `all ${shortName(companies.find((c) => c.ticker === ackTickers[0]).name)}`
      : `across ${ackTickers.length} companies`;
  const ackHref = ackTickers.length === 1 ? `/company/${ackTickers[0]}?status=acknowledged` : "/#companies";
  const example = exampleRow(rows);

  const worse = largestWorse(rows);
  const count = (fn) => rows.reduce((n, r) => n + (fn(r) ? 1 : 0), 0);
  // The main site's four groups, in its order and with its labels, and withdrawn as a fifth of its own.
  const unresolved = count((r) => r.status === "unresolved");
  const withdrawn = count((r) => r.status === "withdrawn");
  const groups = [
    { g: "met", stat: "met", label: "met", n: s.met },
    { g: "acknowledged", stat: "acknowledged-squares", label: "missed and acknowledged", n: count((r) => r.status === "missed" && r.acknowledged) },
    { g: "silent", stat: "never-squares", label: "missed and never acknowledged", n: s.neverAcknowledged },
    { g: "open", stat: "unresolved", label: "still open", n: unresolved },
    { g: "withdrawn", stat: "withdrawn", label: "withdrawn", n: withdrawn },
  ];
  const unitNote = `On scndorder.com still open includes the withdrawn: ${fmt(unresolved + withdrawn)}.`;

  return (
    <div className="stack home">
      <CompanyFinder
        companies={companies}
        head={
          <>
            <h1 className="heading-2">Which companies miss their own guidance, and do they say so?</h1>
            <p className="lead">
              Guidance from 8-K earnings releases, matched to what was reported, with the filings to check.
            </p>
          </>
        }
        start={
          <p className="hero-start">
            We started as a pilot with {companies.length} companies, read by hand before publishing. Request the one
            you cover: we build the record, review it, and tell you when it is live.
          </p>
        }
        strip={
          <ul className="strip" data-testid="headline">
            <li>
              <Link href="/#companies" className="strip-item" data-tile="statements">
                <b className="mono" data-stat="rows">{fmt(s.rows)}</b>
                <span>statements</span>
              </Link>
            </li>
            <li>
              <Link href="/misses" className="strip-item" data-tile="missed">
                <b className="mono" data-stat="missed">{fmt(s.missed)}</b>
                <span>missed</span>
              </Link>
            </li>
            <li>
              <Link href="/misses" className="strip-item hot" data-tile="never">
                <b className="mono" data-stat="never">{fmt(s.neverAcknowledged)}</b>
                <span>never acknowledged</span>
              </Link>
            </li>
            <li>
              <Link href={ackHref} className="strip-item" data-tile="acknowledged">
                <b className="mono" data-stat="acknowledged">{fmt(s.acknowledged)}</b>
                <span>acknowledged, {ackWho}</span>
              </Link>
            </li>
          </ul>
        }
      >
        <section className="heat" aria-label="The dataset at a glance">
          <div className="heat-chart">
            <h2 id="units-h">Every statement, one square</h2>
            <UnitChart groups={groups} total={s.rows} note={unitNote} />
          </div>
          <div className="card feed" data-testid="feed">
            <h2>Largest worse-side misses</h2>
            <p className="feed-by">by distance beyond the guided range</p>
            <ol>
              {worse.slice(0, FEED_ROWS).map((r) => (
                <li key={r.id}>
                  <Link href={`/row/${r.id}`} className="feed-row" data-feed-row={r.id}>
                    <span className="feed-what">
                      {shortName(r.company)} &middot; {r.metric} &middot; {r.period}
                      <small className="mono">
                        guided {formatGuidedShort(r.low, r.high, r.unit)} on {r.statedAt} &middot; reported{" "}
                        {formatValueShort(r.reported, r.unit)}
                      </small>
                    </span>
                    <b className="mono text-worse" data-pct={r.beyondPct ?? ""}>
                      {r.beyondPct == null ? "n/a" : `${r.beyondPct.toFixed(1)}% beyond`}
                    </b>
                  </Link>
                </li>
              ))}
            </ol>
            <Link href="/misses" className="feed-all" data-testid="feed-all">All {fmt(worse.length)} worse-side misses</Link>
          </div>
        </section>
      </CompanyFinder>

      {example ? (
        <details className="panel" id="how-to-read">
          <summary>How to read a row</summary>
          <div className="panel-body stack-tight">
            <p>
              A row is one number a company guided, matched to what it reported. Here is a real one.
            </p>
            <div className="card">
              <h3>{example.company}, {example.metric}, {example.period}</h3>
              <p className="small example-status">
                <StatusBadge status={example.status} direction={example.direction} />{" "}
                {example.direction ? `${example.direction} than guided` : null}
                {example.acknowledged ? `, acknowledged ${formatDate(example.acknowledgedAt)}` : null}
              </p>
              <p className="example-line">{describeRow(example)}</p>
            </div>
            <div className="fields fields-3">
              <div className="card">
                <h3>1. The guidance</h3>
                <Excerpt evidence={example.guidance} />
              </div>
              <div className="card">
                <h3>2. The outcome</h3>
                <Excerpt evidence={example.outcome} />
              </div>
              <div className="card">
                <h3>3. The acknowledgement</h3>
                <Excerpt evidence={example.acknowledgement} />
              </div>
            </div>
            <ul className="small">
              <li><b>met</b>: the reported figure landed inside the guided range.</li>
              <li><b>missed</b>: it landed outside. A beat counts as a miss, so <b>direction</b> says whether the miss was better or worse than guided.</li>
              <li><b>still open</b>: no filing has reported the figure yet.</li>
              <li><b>acknowledged</b>: a later filing refers to the guided figure after the outcome. The test is strict, so it is rare.</li>
            </ul>
            <p className="small faint">
              The <Link href="/methodology">methodology</Link> has the full rules.
            </p>
          </div>
        </details>
      ) : null}

      <section id="request" className="band" aria-labelledby="request-h">
        <h2 id="request-h">Request a company</h2>
        <p>
          Not here yet? Request it and we build the record.
        </p>
        <RequestForm />
      </section>
    </div>
  );
}
