// One square per statement, in the main site's drift-chart order: met, acknowledged, never acknowledged, then
// unresolved and withdrawn. Each group is one SVG path, so 1,316 squares are five elements.
const COLS = 56;
const CELL = 11; // an 8-unit square and a 3-unit gap
const SIZE = 8;

function squares(from, count) {
  let d = "";
  for (let i = from; i < from + count; i++) {
    d += `M${(i % COLS) * CELL} ${Math.floor(i / COLS) * CELL}h${SIZE}v${SIZE}h-${SIZE}z`;
  }
  return d;
}

// `groups` is [{ key, label, count }] in drawing order; keys are met, acknowledged, never, open, withdrawn.
export default function UnitChart({ groups, total }) {
  const rows = Math.ceil(total / COLS);
  const w = COLS * CELL - (CELL - SIZE);
  const h = rows * CELL - (CELL - SIZE);
  // Each group starts where the ones before it end.
  const paths = groups.map((g, i) => ({ ...g, d: squares(groups.slice(0, i).reduce((n, o) => n + o.count, 0), g.count) }));
  const label = `${total.toLocaleString("en-US")} statements, one square each: ${groups.map((g) => `${g.count.toLocaleString("en-US")} ${g.label}`).join(", ")}`;
  return (
    <figure className="units" data-testid="unit-chart">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
        {paths.map((g) => (g.count ? <path key={g.key} data-g={g.key} d={g.d} /> : null))}
      </svg>
      <figcaption>
        <ul className="units-legend">
          {groups.map((g) => (
            <li key={g.key} data-g={g.key}>
              <i aria-hidden="true" />
              <b className="mono" data-stat={g.stat}>{g.count.toLocaleString("en-US")}</b> {g.label}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
