import EdgarLink from "./EdgarLink";

// One piece of evidence: the sentence, then the filing it came from.
export default function Excerpt({ evidence, linkLabel }) {
  if (!evidence) return null;
  return (
    <div>
      <blockquote className="excerpt" data-excerpt>{evidence.excerpt}</blockquote>
      <p className="small" style={{ margin: "var(--s1) 0 0" }}>
        <span className="mono">{evidence.filingType} {evidence.accession}</span>, filed <span className="mono">{evidence.filedAt}</span>
        {" "}
        <EdgarLink evidence={evidence} label={linkLabel} />
      </p>
    </div>
  );
}
