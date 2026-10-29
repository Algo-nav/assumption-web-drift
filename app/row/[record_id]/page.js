import Link from "next/link";
import { notFound } from "next/navigation";
import { getRow } from "../../lib/data";
import { formatGuided, formatValue } from "../../lib/format";
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

  return (
    <div className="stack">
      <section>
        <p style={{ margin: "0 0 8px" }}>
          <Link href={`/company/${r.ticker}`}>{r.company}</Link>
        </p>
        <h1>{r.metric}, {r.period}</h1>
        <p style={{ marginTop: 12 }}>{r.claim}</p>
        <p className="mono" style={{ color: "var(--faint)", margin: "8px 0 0" }}>{r.id}</p>
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
        <h2 id="guidance" style={{ marginBottom: 12 }}>The guidance</h2>
        <Excerpt evidence={r.guidance} />
      </section>

      <section className="card" aria-labelledby="outcome">
        <h2 id="outcome" style={{ marginBottom: 12 }}>The outcome</h2>
        {r.outcome ? <Excerpt evidence={r.outcome} /> : <p style={{ margin: 0 }}>No filing has reported this figure yet.</p>}
      </section>

      {r.acknowledgement ? (
        <section className="card" aria-labelledby="ack">
          <h2 id="ack" style={{ marginBottom: 12 }}>The acknowledgement</h2>
          <Excerpt evidence={r.acknowledgement} />
        </section>
      ) : null}

      <section className="card" aria-labelledby="review">
        <h2 id="review" style={{ marginBottom: 12 }}>Review</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span className="status" data-testid="review-label">
            {handReviewed ? "review: hand-reviewed" : "review: not reviewed"}
          </span>
          {/* Layout slots, not built yet: a machine-reviewed label and a flag button go here. */}
          <span data-slot="review-machine" />
          <span data-slot="flag" />
        </div>
        <p style={{ margin: "12px 0 0", fontSize: "0.875rem" }}>
          {r.reviewer ? <>Reviewed by {r.reviewer}</> : null}
          {r.reviewedAt ? <> on <span className="mono">{r.reviewedAt}</span></> : null}.
        </p>
        {r.reviewerNote ? <p style={{ margin: "8px 0 0" }}>Reviewer note: {r.reviewerNote}</p> : null}
      </section>
    </div>
  );
}
