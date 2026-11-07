"use client";

import { useState } from "react";
import Link from "next/link";
import DirectionBar from "./DirectionBar";
import Logo, { LOGO_TILE } from "./Logo";

// The hero (`head`, the search box, then `children`: the stat tiles and the counts line) and the company grid
// below it are separate sections that share the search state, so the grid still filters as you type.
// Scrolls to the request form on this page and puts the query in its company field.
function requestCompany(query) {
  const field = document.getElementById("req-company");
  const section = document.getElementById("request");
  if (!field || !section) return;
  field.value = query;
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  // Focus without a second jump; the email field is next, so the cursor goes to the end of the prefilled name.
  field.focus({ preventScroll: true });
  field.setSelectionRange(query.length, query.length);
}

export default function CompanyFinder({ companies, head, children }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? companies.filter((c) => c.name.toLowerCase().includes(needle) || c.ticker.toLowerCase().includes(needle))
    : companies;

  return (
    <>
      <section className="hero">
      {head}
      <div className="hero-search">
        <label className="sr-only" htmlFor="company-search">Find a company</label>
        <input
          id="company-search"
          className="input"
          type="search"
          placeholder="Company name or ticker"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
        {needle && shown.length === 0 ? (
          <p className="search-miss" data-testid="search-miss">
            Not here yet.{" "}
            <button type="button" className="link-button" onClick={() => requestCompany(q.trim())}>
              Request {q.trim()}
            </button>
          </p>
        ) : null}
      </div>

      {children}
      </section>

      <section id="companies" aria-labelledby="companies-h" style={{ scrollMarginTop: "var(--s2)" }}>
        <div className="section-head">
          <h2 id="companies-h">{companies.length} companies</h2>
          <span className="small faint" aria-live="polite">
            {needle ? `${shown.length} of ${companies.length} shown` : "Bar: misses split into better and worse than guided"}
          </span>
        </div>
        <ul aria-label="Companies" className="company-grid">
          {shown.map((c) => (
            <li key={c.ticker}>
              <Link href={`/company/${c.ticker}`} className="company-card">
                <span className="top">
                  <span className="ticker">
                    <Logo ticker={c.ticker} ratio={c.logo} max={LOGO_TILE} />
                    <span className="mono">{c.ticker}</span>
                  </span>
                  <span>{c.sector}</span>
                </span>
                <span className="name">{c.name}</span>
                <span className="small">
                  {c.rows} statements, {c.missed} missed, {c.missedWorse} worse, {c.acknowledged} acknowledged
                </span>
                <DirectionBar better={c.missedBetter} worse={c.missedWorse} />
              </Link>
            </li>
          ))}
        </ul>
        {shown.length === 0 && (
          <div className="card empty">
            <h2>No company matches &ldquo;{q.trim()}&rdquo;</h2>
            <p style={{ margin: 0 }}>
              We cover {companies.length} companies today. Try a ticker, or request this one at the bottom of the page.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
