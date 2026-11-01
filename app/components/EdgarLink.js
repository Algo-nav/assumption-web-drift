import { isSecUrl } from "../lib/edgar";

export default function EdgarLink({ evidence, label = "View on EDGAR" }) {
  if (!evidence) return null;
  if (!isSecUrl(evidence.url)) {
    // Not a www.sec.gov URL: show it as inert text so nothing can navigate or execute.
    return (
      <span data-edgar-unlinked>
        <span className="mono">{String(evidence.url ?? "")}</span> (not linked: the source is not an sec.gov address)
      </span>
    );
  }
  return (
    <a href={evidence.url} target="_blank" rel="noopener noreferrer" data-edgar-link>
      {label}
    </a>
  );
}
