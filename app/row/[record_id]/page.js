import Link from "next/link";
import { notFound } from "next/navigation";
import { getRow, getNeighbours } from "../../lib/data";
import { formatGuided, formatValue, describeRow } from "../../lib/format";
import { StatusBadge } from "../../components/StatusBadge";
import Excerpt from "../../components/Excerpt";

export async function generateMetadata({ params }) {
  const { record_id: id } = await params;
  const r = getRow(id);
  return { title: r ? `${r.ticker} ${r.metric} ${r.period}` : "Not found" };
}

export default async function RowPage({ params }) {
  const { record_id: id } = await params;
  const r = getRow(id);
  if (!r) notFound();

  const handReviewed = Boolean(r.reviewer && r.reviewedAt);
  const { prev, next, position, total } = getNeighbours(r);

  return (
    <div className="stack">
      <section>
        <p className="small" style={{ margin: "0 0 var(--s1)" }}>
          <Link href={`/company/${r.ticker}`}>{r.company}</Link>
        </p>
        <h1>{r.metric}, {r.period}</h1>
        <p className="lede">{r.claim}</p>
        <p className="callout" data-testid="what-this-means">{describeRow(r)}</p>
        <p className="mono small faint" style={{ margin: "var(--s2) 0 0" }}>{r.id}</p>
      </section>

      <section className="card">
        <dl className="facts">
          <dt>Status</dt>
          <dd>
            <StatusBadge status={r.status} direction={r.direction} />
            {r.direction ? <span> {r.direction} than guided</span> : null}
          </dd>
          <dt>Guided</dt>
          <dd>{formatGuided(r.low, r.high, r.unit)}</dd>
          <dt>Stated</dt>
          <dd className="mono">{r.statedAt}</dd>
          <dt>Reported</dt>
          <dd>{r.reported == null ? "No outcome in a filing yet" : formatValue(r.reported, r.unit)}</dd>
          <dt>Outcome date</dt>
          <dd className="mono">{r.reportedAt || "none"}</dd>
          <dt>Days to falsifiable</dt>
          <dd>{r.daysToFalsifiable ?? "n/a"}</dd>
          <dt>Acknowledged</dt>
          <dd>{r.acknowledged ? `yes, ${r.acknowledgedAt}${r.daysToAcknowledged != null ? ` (${r.daysToAcknowledged} days after the outcome)` : ""}` : "no"}</dd>
        </dl>
      </section>

      <section className="card" aria-labelledby="guidance">
        <h2 id="guidance" style={{ marginBottom: "var(--s2)" }}>The guidance</h2>
        <Excerpt evidence={r.guidance} />
      </section>

      <section className="card" aria-labelledby="outcome">
        <h2 id="outcome" style={{ marginBottom: "var(--s2)" }}>The outcome</h2>
        {r.outcome ? <Excerpt evidence={r.outcome} /> : <p style={{ margin: 0 }}>No filing has reported this figure yet.</p>}
      </section>

      {r.acknowledgement ? (
        <section className="card" aria-labelledby="ack">
          <h2 id="ack" style={{ marginBottom: "var(--s2)" }}>The acknowledgement</h2>
          <Excerpt evidence={r.acknowledgement} />
        </section>
      ) : null}

      <section className="card" aria-labelledby="review">
        <h2 id="review" style={{ marginBottom: "var(--s2)" }}>Review</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s1)", alignItems: "center" }}>
          <span className="status" data-testid="review-label">
            {handReviewed ? "review: hand-reviewed" : "review: not reviewed"}
          </span>
          {/* Layout slots, not built yet: a machine-reviewed label and a flag button go here. */}
          <span data-slot="review-machine" />
          <span data-slot="flag" />
        </div>
        <p className="small" style={{ margin: "var(--s2) 0 0" }}>
          {r.reviewer ? <>Reviewed by hand by {r.reviewer.charAt(0).toUpperCase() + r.reviewer.slice(1)}</> : null}
          {r.reviewedAt ? <> on <span className="mono">{r.reviewedAt}</span></> : null}.
        </p>
        {r.reviewerNote ? <p style={{ margin: "var(--s1) 0 0" }}>Reviewer note: {r.reviewerNote}</p> : null}
      </section>

      <nav aria-label="Other statements" className="row-nav">
        {prev ? (
          <Link href={`/row/${prev.id}`} data-nav="prev">
            <span className="small faint">Previous {r.metric} statement</span>
            <br />
            {prev.period}, stated <span className="mono">{prev.statedAt}</span>
          </Link>
        ) : (
          <span className="none small">This is the first {r.metric} statement for {r.company}.</span>
        )}
        {next ? (
          <Link href={`/row/${next.id}`} data-nav="next" className="next">
            <span className="small faint">Next {r.metric} statement</span>
            <br />
            {next.period}, stated <span className="mono">{next.statedAt}</span>
          </Link>
        ) : (
          <span className="none small" style={{ textAlign: "right" }}>This is the latest {r.metric} statement for {r.company}.</span>
        )}
        <p className="small faint" style={{ margin: 0, gridColumn: "1 / -1" }}>Statement {position} of {total} for {r.company} on {r.metric}.</p>
      </nav>
    </div>
  );
}
