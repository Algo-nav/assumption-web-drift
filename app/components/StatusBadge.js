export function StatusBadge({ status, direction }) {
  const tone = status === "met" ? " status-met" : status === "missed" ? (direction === "worse" ? " status-worse" : direction === "better" ? " status-better" : "") : "";
  return <span className={`status${tone}`}>{status}</span>;
}

export function DirectionText({ direction }) {
  if (!direction) return <span style={{ color: "var(--faint)" }}>n/a</span>;
  return <span className={direction === "worse" ? "text-worse" : undefined}>{direction}</span>;
}
