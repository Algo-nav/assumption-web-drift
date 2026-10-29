import { DATASET_URL } from "../lib/site";

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--line)" }}>
      <div className="wrap" style={{ paddingTop: 24, paddingBottom: 32, fontSize: "0.875rem", color: "var(--faint)" }}>
        <p style={{ margin: 0 }}>
          Dataset: <a href={DATASET_URL}>assumption-drift</a>, licensed CC-BY-4.0.
        </p>
        <p style={{ margin: "4px 0 0" }}>
          Source: filings on <a href="https://www.sec.gov/edgar">SEC EDGAR</a>. Each row links to the filing it came from.
        </p>
      </div>
    </footer>
  );
}
