"use client";

export default function Error({ retry }) {
  return (
    <div className="nf" role="alert">
      <h1 className="heading-2">Something went wrong on our side</h1>
      <p className="lead">
        The page did not load. Try again, and if it keeps happening, come back in a few minutes.
      </p>
      <div className="nf-links">
        <button type="button" className="btn solid" onClick={() => retry()}>Try again</button>
      </div>
    </div>
  );
}
