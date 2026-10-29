"use client";

import { useState } from "react";
import Link from "next/link";

export default function CompanySearch({ companies }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? companies.filter((c) => c.name.toLowerCase().includes(needle) || c.ticker.toLowerCase().includes(needle))
    : companies;

  return (
    <div>
      <label className="label" htmlFor="company-search">Find a company</label>
      <input
        id="company-search"
        className="input"
        type="search"
        placeholder="NVDA, Salesforce, ..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
      />
      <ul
        aria-label="Companies"
        style={{ listStyle: "none", margin: "16px 0 0", padding: 0, display: "grid", gap: 8 }}
      >
        {shown.map((c) => (
          <li key={c.ticker}>
            <Link
              href={`/company/${c.ticker}`}
              className="card"
              style={{ display: "flex", justifyContent: "space-between", gap: 12, textDecoration: "none", padding: "12px 16px" }}
            >
              <span>
                {c.name} <span className="mono" style={{ color: "var(--faint)" }}>{c.ticker}</span>
              </span>
              <span className="mono" style={{ color: "var(--faint)", whiteSpace: "nowrap" }}>{c.rows} rows</span>
            </Link>
          </li>
        ))}
      </ul>
      {shown.length === 0 && (
        <p style={{ marginTop: 16 }}>
          No match among the 15 companies. Use the request form below to ask for it.
        </p>
      )}
    </div>
  );
}
