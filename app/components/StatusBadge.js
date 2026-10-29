export function StatusBadge({ status, direction }) {
  const worse = status === "missed" && direction === "worse";
  return <span className={`status${worse ? " status-worse" : ""}`}>{status}</span>;
}

export function DirectionText({ direction }) {
  if (!direction) return <span style={{ color: "var(--faint)" }}>n/a</span>;
  return <span className={direction === "worse" ? "text-worse" : undefined}>{direction}</span>;
}
