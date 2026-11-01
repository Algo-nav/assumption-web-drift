import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

// Only what a write-up needs: headings, paragraphs, lists, tables, links, emphasis, code, blockquote.
// `pre` is allowed because fenced code blocks render as <pre><code>. Everything else is dropped with its
// attributes, including script, style, iframe, img, forms and every on* handler.
const OPTIONS = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br",
    "ul", "ol", "li",
    "table", "thead", "tbody", "tr", "th", "td",
    "a",
    "em", "strong", "del",
    "code", "pre",
    "blockquote",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel"],
    th: ["align"],
    td: ["align"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  // Tags that are not allowed are removed together with their content for these, instead of leaking their text.
  nonTextTags: ["script", "style", "textarea", "option", "noscript"],
  transformTags: {
    a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: "noopener" } }),
  },
};

export function renderWriteup(markdown) {
  return sanitizeHtml(marked.parse(markdown, { gfm: true }), OPTIONS);
}
