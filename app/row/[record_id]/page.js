import ReviewMachine from "../../components/ReviewMachine";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRow, getNeighbours } from "../../lib/data";
import { formatGuided, formatValue, describeRow, formatClaim } from "../../lib/format";
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
    <div className="stack reading">
      <section>
        <p className="crumb">
          <Link href={`/company/${r.ticker}`}>{r.company}</Link>
        </p>
        <h1>{r.metric}, {r.period}</h1>
        <p className="lede">{formatClaim(r.claim)}</p>
        <p className="callout" data-testid="what-this-means">{describeRow(r)}</p>
        <p className="row-id mono">{r.id}</p>
      </section>

      <section className="card" aria-label="The row">
        <dl className="facts">
          <dt>Status</dt>
          <dd>
            <StatusBadge status={r.status} direction={r.direction} />
            {r.direction ? <span> {r.direction} than guided</span> : null}
          </dd>
          <dt>Guided</dt>
          <dd className="figure-sm">{formatGuided(r.low, r.high, r.unit)}</dd>
          <dt>Stated</dt>
          <dd className="mono">{r.statedAt}</dd>
          <dt>Reported</dt>
          <dd className={r.reported == null ? undefined : "figure-sm"}>{r.reported == null ? "No outcome in a filing yet" : formatValue(r.reported, r.unit)}</dd>
          <dt>Outcome date</dt>
          <dd className="mono">{r.reportedAt || "none"}</dd>
          <dt>Days to falsifiable</dt>
          <dd>{r.daysToFalsifiable ?? "n/a"}</dd>
          <dt>Acknowledged</dt>
          <dd>{r.acknowledged ? `yes, ${r.acknowledgedAt}${r.daysToAcknowledged != null ? ` (${r.daysToAcknowledged} days after the outcome)` : ""}` : "no"}</dd>
        </dl>
      </section>

      <section className="card" aria-labelledby="guidance">
        <h2 id="guidance">The guidance</h2>
        <Excerpt evidence={r.guidance} />
      </section>

      <section className="card" aria-labelledby="outcome">
        <h2 id="outcome">The outcome</h2>
        {r.outcome ? <Excerpt evidence={r.outcome} /> : <p>No filing has reported this figure yet.</p>}
      </section>

      {r.acknowledgement ? (
        <section className="card" aria-labelledby="ack">
          <h2 id="ack">The acknowledgement</h2>
          <Excerpt evidence={r.acknowledgement} />
        </section>
      ) : null}

      <section className="card" aria-labelledby="review">
        <h2 id="review">Review</h2>
        <div className="review-tags">
          <span className="tag" data-testid="review-label">
            {handReviewed ? "review: hand-reviewed" : "review: not reviewed"}
          </span>
          {/* Layout slot, not built yet: a flag button goes here. */}
          <ReviewMachine row={r} />
        </div>
        <p className="small review-by">
          {r.reviewer ? <>Reviewed by hand by {r.reviewer.charAt(0).toUpperCase() + r.reviewer.slice(1)}</> : null}
          {r.reviewedAt ? <> on <span className="mono">{r.reviewedAt}</span></> : null}.
        </p>
        {r.reviewerNote ? <p className="review-by">Reviewer note: {r.reviewerNote}</p> : null}
      </section>

      <nav aria-label="Other statements" className="row-nav">
        {prev ? (
          <Link href={`/row/${prev.id}`} data-nav="prev" className="plate">
            <span className="small faint">Previous {r.metric} statement</span>
            {prev.period}, stated <span className="mono">{prev.statedAt}</span>
          </Link>
        ) : (
          <span className="none small">This is the first {r.metric} statement for {r.company}.</span>
        )}
        {next ? (
          <Link href={`/row/${next.id}`} data-nav="next" className="plate next">
            <span className="small faint">Next {r.metric} statement</span>
            {next.period}, stated <span className="mono">{next.statedAt}</span>
          </Link>
        ) : (
          <span className="none next small">This is the latest {r.metric} statement for {r.company}.</span>
        )}
        <p className="small faint">Statement {position} of {total} for {r.company} on {r.metric}.</p>
      </nav>
    </div>
  );
}
