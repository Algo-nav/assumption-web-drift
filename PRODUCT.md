# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Reader:** an analyst or portfolio manager who covers one of the companies and wants to check a guidance statement against what was reported, with the filing in front of them.
- **Sceptic:** anyone deciding whether to trust SCND Order's method. They arrive from scndorder.com and look for a row they already know.
- **Requester:** someone whose company is not here yet.

## Product Purpose

assumption-drift is a public dataset of guidance. Every number a company guided in its 8-K earnings releases is matched to what it later reported, and to whether a later filing acknowledged the difference. Every row links to the filings on SEC EDGAR.

Success on this site is two things: a reader checks a row against its filing, and a reader whose company is missing requests it.

## Positioning

The pilot is the method shown in public before anyone is asked for trust. The main site argues for the record; this site is one. It makes no claim a reader cannot check from the page.

## Operating Context

- **This site:** pilot.scndorder.com. Home, /company/[ticker], /row/[record_id], /misses, /compare, /methodology. Public since November 2026.
- **The main site:** scndorder.com. About, Contact, Privacy and Terms live there and are linked from here.
- The request form writes to SQLite; a success state is shown only after the row is written, and a database failure is a 503.
- No model calls and no API keys at run time. The release file and the write-up are fetched at build time, pinned to a commit.

## Capabilities and Constraints

- Every number on every page is computed from the release file through `app/lib/data`. Rows are read in `app/lib/data/source.js` and nowhere else.
- The write-up on /methodology is the dataset's own text, sanitized to a small allowlist. Its counts were taken when it was written; the counts beside it are computed from the file being served.
- An excerpt is quoted exactly as filed, including its punctuation.
- The Content-Security-Policy allows scripts by per-request nonce only. No third-party scripts, styles, fonts or images.
- Fiscal year ends, sectors and metric polarity are tables maintained by hand in `app/lib/data`; a new company needs a row in each.

## Brand Commitments

- Name: SCND Order. Wordmark set in Boldonse, used for the wordmark only.
- The product name assumption-drift is written lower case with a hyphen.
- Aspekta (self-hosted) is the one heading and body face. IBM Plex Mono for figures, dates, ids and captions.
- Sentence case. Plain statements; no superlatives. A beat counts as a miss, and the page says which way it missed.
- The status names are the dataset's: met, missed, unresolved, withdrawn. The value "unresolved" is shown as "still open", the main site's wording, everywhere on this site; the field value stays "unresolved" in URLs and in the data, and the write-up on /methodology keeps its own definition.

## Evidence on Hand

- The release file: statements, statuses, outcomes and acknowledgements for the companies covered, each with its filing.
- The write-up published with the dataset, including what the model got wrong.
- Dataset licence CC BY 4.0; source filings on SEC EDGAR.
- No customer logos, testimonials or pricing. Company logos are the covered companies' own marks, used to identify them (`public/logos/SOURCES.md`).

## Product Principles

1. A source on every line.
2. The number on the page is the number in the file.
3. Colour means one thing (DESIGN.md, "Data colours").
4. The filter state is the URL, so a view can be sent to someone else.

## Accessibility & Inclusion

Semantic landmarks, a skip link, visible focus, WCAG AA contrast for text, `prefers-reduced-motion` honoured (movement drops to opacity), no horizontal overflow at 390px. Status is never carried by colour alone. Filters and the rail work without scripting, because they are links.
