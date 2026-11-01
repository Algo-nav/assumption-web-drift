import { loadWriteup } from "../lib/data/source";
import { renderWriteup } from "../lib/writeup";
import { getAllRows, summarise } from "../lib/data";

export const metadata = { title: "Methodology" };

export default function Methodology() {
  // The write-up is third-party content: it is sanitized to a small allowlist before it is injected as HTML.
  const html = renderWriteup(loadWriteup());
  const s = summarise(getAllRows());
  const fmt = (n) => n.toLocaleString("en-US");
  const pct = s.neverAcknowledgedShare == null ? "n/a" : `${(s.neverAcknowledgedShare * 100).toFixed(1)}%`;
  return (
    <div className="stack">
      <p className="card small" style={{ margin: 0, maxWidth: "56ch" }}>
        This is the write-up published with the dataset. The counts in it were taken when it was written.
        The counts in the grid at the foot of this page and on the home page are computed from the release file this site is serving.
      </p>
      <article className="card prose" dangerouslySetInnerHTML={{ __html: html }} />
      <section className="band" aria-labelledby="numbers">
        <div className="section-head">
          <h2 id="numbers">The record in full</h2>
        </div>
        <div className="stat-grid" data-testid="record-grid">
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
      </section>
    </div>
  );
}
