import { DATASET_URL } from "../lib/site";

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--line)" }}>
      <div className="wrap small faint" style={{ paddingTop: "var(--s3)", paddingBottom: "var(--s4)" }}>
        <p style={{ margin: 0 }}>
          Dataset: <a href={DATASET_URL}>assumption-drift</a>, licensed CC-BY-4.0.
        </p>
        <p style={{ margin: "var(--s1) 0 0" }}>
          Source: filings on <a href="https://www.sec.gov/edgar">SEC EDGAR</a>. Each row links to the filing it came from.
        </p>
      </div>
    </footer>
  );
}
