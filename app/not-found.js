import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card empty">
      <h1 style={{ fontSize: "var(--fs-l)" }}>We could not find that page</h1>
      <p style={{ margin: "var(--s1) 0 var(--s2)" }}>
        The company or row may not exist, or the link may be out of date.
      </p>
      <Link href="/" className="btn btn-cta btn-sm">Back to all companies</Link>
    </div>
  );
}
