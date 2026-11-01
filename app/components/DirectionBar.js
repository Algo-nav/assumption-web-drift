// Misses split by direction: better than guided versus worse than guided.
export default function DirectionBar({ better, worse, legend = false }) {
  const total = better + worse;
  const label = total === 0 ? "No misses" : `${better} missed on the better side, ${worse} on the worse side`;
  return (
    <div>
      <div className="dirbar" role="img" aria-label={label} title={label}>
        {total > 0 ? (
          <>
            <i className="better" style={{ width: `${(better / total) * 100}%` }} />
            <i className="worse" style={{ width: `${(worse / total) * 100}%` }} />
          </>
        ) : null}
      </div>
      {legend ? (
        <div className="dirbar-key">
          <span><i style={{ background: "var(--mark-better)" }} />{better} better</span>
          <span><i style={{ background: "var(--red)" }} />{worse} worse</span>
        </div>
      ) : null}
    </div>
  );
}
