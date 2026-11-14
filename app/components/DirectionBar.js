// Misses by direction, drawn as shares of the company's statements (`of`): the green segment is the share that
// missed on the better side, the brick segment the share that missed on the worse side, and the rest of the
// track is every other statement. Bars on different companies can be compared. Without `of` the two segments
// fill the bar between them.
export const BAR_CAPTION = "share of all statements: missed better, missed worse";

export default function DirectionBar({ better, worse, of = null, legend = false }) {
  const total = better + worse;
  const base = of && of >= total ? of : total;
  // The caption's own words, with this company's counts in them.
  const label = `Share of all statements: ${better} missed better, ${worse} missed worse`;
  return (
    <div>
      <div className="dirbar" role="img" aria-label={label} title={label}>
        {total > 0 ? (
          <>
            <i className="better" style={{ width: `${(better / base) * 100}%` }} />
            <i className="worse" style={{ width: `${(worse / base) * 100}%` }} />
          </>
        ) : null}
      </div>
      {legend ? (
        <div className="dirbar-key" data-testid="bar-caption">
          <span>Share of all statements:</span>
          <span><i className="sw better" />{better} missed better</span>
          <span><i className="sw worse" />{worse} missed worse</span>
        </div>
      ) : null}
    </div>
  );
}
