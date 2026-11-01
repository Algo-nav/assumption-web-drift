import { niceTicks, formatTick } from "../lib/chart";

const W = 520;
const H = 240;
const M = { l: 72, r: 16, t: 24, b: 32 };
const DAY = 86400000;

function tone(p) {
  if (p.status === "met") return "met";
  if (p.status === "missed") return p.direction === "worse" ? "worse" : p.direction === "better" ? "better" : "met";
  return "open";
}

// One metric over time. Each guidance statement is a vertical bar from its low to its high at the date it was
// stated. The reported figure is a dot at the outcome date, joined to the bar by a thin line.
// `highlight` maps a row id to a short label; every other point is dimmed.
export default function Chart({ group, highlight = null }) {
  const pts = group.points;
  const ys = pts.flatMap((p) => [p.lo, p.hi, ...(p.rep == null ? [] : [p.rep])]);
  let y0 = Math.min(...ys);
  let y1 = Math.max(...ys);
  if (y0 === y1) {
    const pad = Math.abs(y0) * 0.1 || 1;
    y0 -= pad;
    y1 += pad;
  }
  const yPad = (y1 - y0) * 0.08;
  y0 -= yPad;
  y1 += yPad;
  const xs = pts.flatMap((p) => [p.x0, ...(p.x1 == null ? [] : [p.x1])]);
  let x0 = Math.min(...xs);
  let x1 = Math.max(...xs);
  const xPad = Math.max((x1 - x0) * 0.03, 15 * DAY);
  x0 -= xPad;
  x1 += xPad;

  const X = (v) => M.l + ((v - x0) / (x1 - x0)) * (W - M.l - M.r);
  const Y = (v) => H - M.b - ((v - y0) / (y1 - y0)) * (H - M.t - M.b);

  const yTicks = niceTicks(y0, y1, 4);
  const yearFrom = new Date(x0).getUTCFullYear() + 1;
  const yearTo = new Date(x1).getUTCFullYear();
  const step = yearTo - yearFrom > 6 ? 2 : 1;
  const xTicks = [];
  for (let y = yearFrom; y <= yearTo; y += step) xTicks.push(Date.UTC(y, 0, 1));

  const ordered = highlight ? [...pts].sort((a, b) => Number(Boolean(highlight[a.id])) - Number(Boolean(highlight[b.id]))) : pts;

  return (
    <div className="chart" data-chart data-metric={group.title}>
      <h3>{group.title}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${group.title}: guided ranges and reported figures over time`}>
        {yTicks.map((v) => (
          <g key={v}>
            <line className="grid-line" x1={M.l} x2={W - M.r} y1={Y(v)} y2={Y(v)} />
            <text x={M.l - 8} y={Y(v) + 4} textAnchor="end">{formatTick(v, group.family)}</text>
          </g>
        ))}
        {xTicks.map((v) => (
          <text key={v} x={X(v)} y={H - 8} textAnchor="middle">{new Date(v).getUTCFullYear()}</text>
        ))}
        {ordered.map((p) => {
          const c = `tone-${tone(p)}`;
          const px = X(p.x0);
          const top = Y(p.hi);
          const bottom = Y(p.lo);
          const mid = (top + bottom) / 2;
          const picked = highlight ? highlight[p.id] : null;
          const dim = highlight && !picked ? " dim" : "";
          const label = `${p.text}`;
          return (
            <a key={p.id} href={`/row/${p.id}`} className={`pt${dim}`} aria-label={label} data-point={p.id}>
              <title>{label}</title>
              <rect className="hit" x={px - 6} y={top - 4} width={12} height={Math.max(bottom - top, 0) + 8} />
              {p.rep != null && p.x1 != null ? (
                <line className={`link-line ${c}`} x1={px} y1={mid} x2={X(p.x1)} y2={Y(p.rep)} />
              ) : null}
              <line className={`bar ${c}`} x1={px} x2={px} y1={top - 1.5} y2={bottom + 1.5} />
              {p.rep != null && p.x1 != null ? <circle className={`dot ${c}`} cx={X(p.x1)} cy={Y(p.rep)} r={picked ? 5 : 3} /> : null}
              {picked ? (
                <text className="pick-label" x={px} y={top - 8} textAnchor="middle">{picked}</text>
              ) : null}
            </a>
          );
        })}
      </svg>
    </div>
  );
}

export function ChartKey() {
  return (
    <div className="chart-key" aria-label="Chart key">
      <span>Bar: the guided range, at the date it was stated</span>
      <span>Dot: the reported figure, at the outcome date</span>
      <span><i style={{ background: "var(--mark-met)" }} />met</span>
      <span><i style={{ background: "var(--mark-better)" }} />missed, better</span>
      <span><i style={{ background: "var(--red)" }} />missed, worse</span>
      <span><i style={{ background: "var(--mark-open)" }} />not resolved</span>
    </div>
  );
}
