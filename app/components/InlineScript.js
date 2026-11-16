"use client";

// An inline script that runs while the browser parses the server's HTML, before first paint. It has to be a
// client component: on the server the tag is executable JavaScript; when React renders it in the browser (a
// client navigation, or the not-found path) it is inert text, so React does not warn about a script it will
// never run. This is the helper from the Next guide on preventing flash before hydration, with the page's CSP
// nonce passed through.
export default function InlineScript({ html, nonce, id }) {
  return (
    <script
      id={id}
      nonce={nonce}
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
