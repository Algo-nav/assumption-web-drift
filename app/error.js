"use client";

export default function Error({ retry }) {
  return (
    <div className="card empty" role="alert">
      <h1 style={{ fontSize: "var(--fs-l)" }}>Something went wrong on our side</h1>
      <p style={{ margin: "var(--s1) 0 var(--s2)" }}>
        The page did not load. Try again, and if it keeps happening, come back in a few minutes.
      </p>
      <button type="button" className="btn btn-cta btn-sm" onClick={() => retry()}>Try again</button>
    </div>
  );
}
