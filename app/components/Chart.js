import { yAxis, plotsReported, xDomain, fiscalTicks } from "../lib/chart";

const W = 520;
const H = 480;
// Plex Mono advance is 0.6em. Tick labels are 12px at desktop and 16px (in chart units) on phones, so the left
// gutter is sized for the larger one; labels are right-aligned against the plot either way.
const CHAR = 0.6 * 16;
const GAP = 8;
const M = { r: 6, t: 14, b: 26 };
// Dot radius plus half the bar plus a pixel: closer than this, dot and bar touch and need no joining line.
const TOUCH = 4 + 1.5 + 1;

function tone(p) {
  if (p.status === "met") return "met";
  if (p.status === "missed") return p.direction === "worse" ? "worse" : p.direction === "better" ? "better" : "met";
  return "open";
}

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

// One metric over time. Each guidance statement is a vertical bar from its low to its high at the date it was
// stated. The reported figure is a dot at the outcome date, joined to the bar by a thin line unless the two touch.
// An unresolved statement is a hollow bar and has no dot. When the axis is trimmed, a value beyond it is drawn as a
// small arrow at the plot edge instead of off the chart.
// `x` is a shared [from, to] time range and `gutter` a shared label width, so the charts of one company line up; `highlight` maps a row id to a
// short label, and every other point is dimmed.
export default function Chart({ group, highlight = null, x = null, gutter = null }) {
  const pts = group.points;
  const shown = plotsReported;
  const { scale, T, dom, ticks: yTicks, labels } = yAxis(group);
  const [x0, x1] = x || xDomain([group]);
  // `gutter` (characters) is shared by the charts of one company so their plots, and year ticks, line up.
  const L = Math.ceil((gutter || Math.max(...labels.map((s) => s.length))) * CHAR + GAP);
  const top = M.t;
  const bottom = H - M.b;

  const X = (v) => L + ((v - x0) / (x1 - x0)) * (W - L - M.r);
  const Yraw = (v) => bottom - ((T(v) - dom.lo) / (dom.hi - dom.lo)) * (bottom - top);
  const Y = (v) => clamp(Yraw(v), top, bottom);
  const out = (v) => (Yraw(v) < top - 0.5 ? "up" : Yraw(v) > bottom + 0.5 ? "down" : null);
  const beyond = pts.filter((p) => out(p.lo) || out(p.hi) || (shown(p) && out(p.rep))).length;

  const years = fiscalTicks(group.ticker, x0, x1);
  const ordered = highlight ? [...pts].sort((a, b) => Number(Boolean(highlight[a.id])) - Number(Boolean(highlight[b.id]))) : pts;
  const notes = [scale === "log" ? "log scale" : null, beyond ? `axis trimmed; ${beyond} point${beyond === 1 ? "" : "s"} beyond` : null].filter(Boolean);

  const Arrow = ({ cx, dir, c }) => (
    <path className={`edge ${c}`} d={dir === "up" ? `M${cx - 4} ${top + 5}L${cx} ${top - 1}L${cx + 4} ${top + 5}Z` : `M${cx - 4} ${bottom - 5}L${cx} ${bottom + 1}L${cx + 4} ${bottom - 5}Z`} />
  );

  return (
    <div className="chart" data-chart data-metric={group.title} data-scale={scale} data-beyond={beyond}>
      <div className="chart-head">
        <h3 title={group.title}>{group.title}</h3>
        {notes.length ? <span className="chart-note">{notes.join(" · ")}</span> : null}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${group.title}: guided ranges and reported figures over time`}>
        {yTicks.map((v, i) => (
          <g key={v}>
            <line className="grid-line" x1={L} x2={W - M.r} y1={Yraw(v)} y2={Yraw(v)} />
            <text className="y-tick" x={L - GAP} y={Yraw(v)} dominantBaseline="central" textAnchor="end">{labels[i]}</text>
          </g>
        ))}
        <line className="axis-line" x1={L} x2={W - M.r} y1={bottom} y2={bottom} />
        {years.map((yr) => (
          <g key={yr.fy}>
            {yr.boundary != null ? <line className="x-tick" x1={X(yr.boundary)} x2={X(yr.boundary)} y1={bottom} y2={bottom + 5} /> : null}
            {X(yr.end) - X(yr.start) >= 4 * CHAR + 2 ? (
              <text className="x-label" x={(X(yr.start) + X(yr.end)) / 2} y={H - 2} textAnchor="middle">FY{String(yr.fy).slice(2)}</text>
            ) : null}
          </g>
        ))}
        {ordered.map((p) => {
          const c = `tone-${tone(p)}`;
          const px = X(p.x0);
          const t = Y(p.hi);
          const b = Y(p.lo);
          const mid = (t + b) / 2;
          const picked = highlight ? highlight[p.id] : null;
          const dim = highlight && !picked ? " dim" : "";
          const rep = shown(p);
          const dx = rep ? X(p.x1) : 0;
          const dy = rep ? Y(p.rep) : 0;
          const touches = rep && Math.hypot(dx - px, Math.max(0, t - dy, dy - b)) <= TOUCH;
          const open = p.status === "unresolved";
          return (
            <a key={p.id} href={`/row/${p.id}`} className={`pt${dim}`} aria-label={p.text} data-point={p.id} data-status={p.status}>
              <title>{p.text}</title>
              <rect className="hit" x={px - 6} y={t - 4} width={12} height={Math.max(b - t, 0) + 8} />
              {rep && !touches ? <line className={`link-line ${c}`} x1={px} y1={mid} x2={dx} y2={dy} /> : null}
              {open ? (
                <rect className={`bar-open ${c}`} x={px - 2.5} y={Math.min(t, mid - 2.5)} width={5} height={Math.max(b - t, 5)} />
              ) : (
                <line className={`bar ${c}`} x1={px} x2={px} y1={t - 1.5} y2={b + 1.5} />
              )}
              {out(p.hi) === "up" ? <Arrow cx={px} dir="up" c={c} /> : null}
              {out(p.lo) === "down" ? <Arrow cx={px} dir="down" c={c} /> : null}
              {rep && out(p.rep) ? (
                <Arrow cx={dx} dir={out(p.rep)} c={c} />
              ) : rep ? (
                <line className={`dot ${c}${picked ? " dot-pick" : ""}`} x1={dx} x2={dx} y1={dy} y2={dy} />
              ) : null}
              {picked ? (
                <text className="pick-label" x={px} y={Math.max(t - 8, 12)} textAnchor="middle">{picked}</text>
              ) : null}
            </a>
          );
        })}
      </svg>
    </div>
  );
}

// The one key for a section of charts.
export function ChartKey() {
  return (
    <div className="chart-key" aria-label="Chart key">
      <span>Bar: guided range, on the date stated</span>
      <span>Dot: reported figure, on the outcome date</span>
      <span><i style={{ background: "var(--mark-met)" }} />met</span>
      <span><i style={{ background: "var(--mark-better)" }} />missed, better</span>
      <span><i style={{ background: "var(--red)" }} />missed, worse</span>
      <span><i className="key-open" />unresolved</span>
      <span><i style={{ background: "var(--mark-open)" }} />withdrawn</span>
    </div>
  );
}
