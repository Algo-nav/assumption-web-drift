// A status is a square in its data colour and the status name: powder met, green better, brick worse, a hollow
// square for unresolved. `joined` adds the direction to the name ("missed, worse") where a table has no
// direction column of its own.
function toneOf(status, direction) {
  if (status === "met") return "met";
  if (status === "missed") return direction === "worse" ? "worse" : direction === "better" ? "better" : "met";
  if (status === "unresolved") return "open";
  if (status === "withdrawn") return "withdrawn";
  return "";
}

export function StatusBadge({ status, direction, joined = false }) {
  const tone = toneOf(status, direction);
  return (
    <span className={`status${tone ? ` status-${tone}` : ""}`}>
      {tone ? <i className={`sw ${tone}`} aria-hidden="true" /> : null}
      {joined && direction ? `${status}, ${direction}` : status}
    </span>
  );
}

export function DirectionText({ direction }) {
  if (!direction) return <span className="faint">n/a</span>;
  return <span className={direction === "worse" ? "text-worse" : undefined}>{direction}</span>;
}
