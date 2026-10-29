export default function EdgarLink({ evidence, label = "View on EDGAR" }) {
  if (!evidence) return null;
  return (
    <a href={evidence.url} target="_blank" rel="noopener noreferrer" data-edgar-link>
      {label}
    </a>
  );
}
