import Link from "next/link";
import NotFoundPath from "./components/NotFoundPath";

export const metadata = { title: "Not found" };

// 404, in the main site's register: a lookup that found nothing, written as a record entry.
export default function NotFound() {
  return (
    <div className="nf">
      <h1 className="heading-2">We could not find that page</h1>
      <p className="lead">The company or row may not exist, or the link may be out of date.</p>
      <div className="entry bad nf-entry" data-testid="not-found-entry">
        <p className="entry-type">lookup, not found</p>
        <p className="entry-body">No page is filed here.</p>
        <NotFoundPath />
      </div>
      <div className="nf-links">
        <Link className="btn solid" href="/">Back to all companies</Link>
        <Link className="textlink body-6" href="/misses">Misses</Link>
      </div>
    </div>
  );
}
