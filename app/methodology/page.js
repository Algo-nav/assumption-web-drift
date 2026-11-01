import { loadWriteup } from "../lib/data/source";
import { renderWriteup } from "../lib/writeup";

export const metadata = { title: "Methodology" };

export default function Methodology() {
  // The write-up is third-party content: it is sanitized to a small allowlist before it is injected as HTML.
  const html = renderWriteup(loadWriteup());
  return (
    <div className="stack">
      <p className="card small" style={{ margin: 0 }}>
        This is the write-up published with the dataset. The counts in it were taken when it was written.
        The counts on the home page are computed from the release file this site is serving.
      </p>
      <article className="card prose" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
