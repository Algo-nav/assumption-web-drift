"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DirectionBar, { BAR_CAPTION } from "./DirectionBar";
import Logo, { LOGO_TILE } from "./Logo";

// The hero (`head`, the search box, `start`, `strip`), whatever sits between (`children`: the unit chart and the
// misses feed) and the company grid are separate sections that share the search state, so the grid still
// filters as you type.

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

const MAX_FOUND = 5;

const SORTS = [
  ["name", "A to Z", (a, b) => a.name.localeCompare(b.name)],
  ["worse", "Most worse-side misses", (a, b) => b.missedWorse - a.missedWorse || a.name.localeCompare(b.name)],
  ["rows", "Most statements", (a, b) => b.rows - a.rows || a.name.localeCompare(b.name)],
];

export default function CompanyFinder({ companies, head, start, strip, children }) {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("");
  const [sort, setSort] = useState("name");
  const box = useRef(null);
  const router = useRouter();
  const needle = q.trim().toLowerCase();

  // "/" puts the cursor in the search box, from anywhere on the page that is not already a field.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      box.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sectors come from the data, most companies first, so a new sector appears here without a change.
  const sectorCounts = new Map();
  for (const c of companies) if (c.sector) sectorCounts.set(c.sector, (sectorCounts.get(c.sector) || 0) + 1);
  const sectors = [...sectorCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const matched = needle
    ? companies.filter((c) => c.name.toLowerCase().includes(needle) || c.ticker.toLowerCase().includes(needle))
    : companies;
  // A search looks through every company; the sector chips narrow the grid only while the box is empty.
  const shown = (needle || !sector ? matched : matched.filter((c) => c.sector === sector))
    .slice()
    .sort(SORTS.find(([k]) => k === sort)[2]);
  const narrowed = needle || sector;

  return (
    <>
      <section className="hero">
        {head}
        <div className="hero-search">
          <label className="sr-only" htmlFor="company-search">Find a company</label>
          <input
            ref={box}
            id="company-search"
            className="field"
            type="search"
            placeholder="Search a company or ticker, or request one"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
            aria-keyshortcuts="/"
            aria-describedby="search-found"
            onKeyDown={(e) => {
              // Enter opens the first match; with no match it starts a request for what was typed.
              if (e.key !== "Enter" || !needle) return;
              e.preventDefault();
              if (matched.length) router.push(`/company/${matched[0].ticker}`);
              else requestCompany(q.trim());
            }}
          />
          {q ? null : <kbd className="hero-key mono" aria-hidden="true">/</kbd>}
          {/* What the search found, where the eye already is: the grid it filters is a screen further down. */}
          <div id="search-found" className="search-found" data-testid="search-found" aria-live="polite">
            {needle && matched.length > 0 ? (
              <>
                {matched.slice(0, MAX_FOUND).map((c) => (
                  <Link key={c.ticker} href={`/company/${c.ticker}`} className="pill">
                    <span className="mono">{c.ticker}</span>{c.shortName}
                  </Link>
                ))}
                {matched.length > MAX_FOUND ? <a href="#companies" className="small">{matched.length - MAX_FOUND} more below</a> : null}
              </>
            ) : null}
          </div>
          {needle && matched.length === 0 ? (
            <p className="search-miss" data-testid="search-miss">
              Not here yet.{" "}
              <button type="button" className="link-button" onClick={() => requestCompany(q.trim())}>
                Request {q.trim()}
              </button>
            </p>
          ) : null}
        </div>
        {start}
        {strip}
      </section>

      {children}

      <section id="companies" className="companies" aria-labelledby="companies-h">
        <div className="section-head">
          <h2 id="companies-h">{companies.length} companies</h2>
          <span className="small faint" aria-live="polite" data-testid="grid-caption">
            {narrowed ? `${shown.length} of ${companies.length} shown` : `Bar: ${BAR_CAPTION}`}
          </span>
        </div>
        <div className="grid-tools">
          <div className="pill-group" role="group" aria-label="Sector">
            <button type="button" className="pill" aria-pressed={!sector} onClick={() => setSector("")}>All</button>
            {sectors.map(([name, n]) => (
              <button key={name} type="button" className="pill" aria-pressed={sector === name} onClick={() => setSector(sector === name ? "" : name)}>
                {name} <span className="mono">{n}</span>
              </button>
            ))}
          </div>
          <div className="pill-group" role="group" aria-label="Order">
            {SORTS.map(([key, label]) => (
              <button key={key} type="button" className="pill" aria-pressed={sort === key} onClick={() => setSort(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <ul aria-label="Companies" className="company-grid">
          {shown.map((c) => (
            <li key={c.ticker}>
              <Link href={`/company/${c.ticker}`} className="company-card plate">
                <span className="top">
                  <span className="ticker">
                    <Logo ticker={c.ticker} ratio={c.logo} max={LOGO_TILE} />
                    <span className="mono">{c.ticker}</span>
                  </span>
                </span>
                <span className="name">{c.name}</span>
                {c.sector ? <span className="sector">{c.sector}</span> : null}
                <span className="counts">
                  {c.rows} statements, {c.missed} missed, {c.missedWorse} worse, {c.acknowledged} acknowledged
                </span>
                <DirectionBar better={c.missedBetter} worse={c.missedWorse} of={c.rows} />
              </Link>
            </li>
          ))}
        </ul>
        {shown.length === 0 && (
          <div className="card empty">
            <h2>No company matches &ldquo;{q.trim()}&rdquo;</h2>
            <p>
              We cover {companies.length} companies today. Try a ticker, or request this one at the bottom of the page.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
