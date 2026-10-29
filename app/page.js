import { getAllRows, getCompanies, summarise } from "./lib/data";
import CompanySearch from "./components/CompanySearch";
import RequestForm from "./components/RequestForm";

export default function Home() {
  const s = summarise(getAllRows());
  const companies = getCompanies();
  const pct = s.neverAcknowledgedShare == null ? "n/a" : `${(s.neverAcknowledgedShare * 100).toFixed(1)}%`;
  const fmt = (n) => n.toLocaleString("en-US");

  return (
    <div className="stack">
      <section>
        <h1>What companies guided, and what happened next</h1>
        <p style={{ maxWidth: 680, marginTop: 12 }}>
          A row is one number a company gave in an SEC filing about its own future, matched to the figure it
          reported later and to any later filing that mentions it.
        </p>
      </section>

      <section aria-labelledby="numbers">
        <h2 id="numbers" style={{ marginBottom: 12 }}>The numbers</h2>
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
        <p style={{ fontSize: "0.875rem", color: "var(--faint)", marginTop: 12, maxWidth: 680 }}>
          Counted from the {fmt(s.rows)} rows in the release file. A beat counts as a miss, so better and worse
          are split out. The methodology page explains what acknowledged means.
        </p>
      </section>

      <section className="card" aria-labelledby="find">
        <h2 id="find" style={{ marginBottom: 12 }}>The {companies.length} companies</h2>
        <CompanySearch companies={companies} />
      </section>

      <section className="card" aria-labelledby="request">
        <h2 id="request">Request a company</h2>
        <p style={{ margin: "8px 0 16px", maxWidth: 680 }}>
          Want a company that is not here? Tell us which one and we will email you if we add it.
        </p>
        <RequestForm />
      </section>
    </div>
  );
}
