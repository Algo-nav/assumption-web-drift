---
name: assumption-drift (pilot.scndorder.com)
description: The SCND Order system, applied to the public dataset. Navy ground, powder type, one scarlet accent, and five data colours that each mean one thing.
colors:
  navy: "#0A1A33"
  navy-deep: "#06112A"
  navy-raised: "#122747"
  powder: "#BCD3EA"
  powder-bright: "#E6EFF8"
  powder-dim: "#7F9CBF"
  powder-ink: "#55698A"
  ink: "#0B1730"
  ink-soft: "#2E4263"
  white: "#FFFFFF"
  scarlet: "#FF2400"
  scarlet-lift: "#FF4A2E"
  brick: "#B42318"
  brick-wash: "#FDECEA"
  brick-lift: "#FF9F94"
  green: "#5FA57F"
  amber: "#C27A12"
  line: "rgba(188,211,234,.16)"
  line-ink: "rgba(11,23,48,.14)"
typography:
  heading-1: { fontFamily: "Aspekta, system-ui, sans-serif", fontSize: "60px", lineHeight: "60px", fontWeight: 600, letterSpacing: "-0.02em" }
  heading-2: { fontFamily: "Aspekta, system-ui, sans-serif", fontSize: "48px", lineHeight: "48px", fontWeight: 600, letterSpacing: "-0.02em" }
  heading-3: { fontFamily: "Aspekta, system-ui, sans-serif", fontSize: "36px", lineHeight: "40px", fontWeight: 600, letterSpacing: "-0.01em" }
  heading-4: { fontFamily: "Aspekta, system-ui, sans-serif", fontSize: "30px", lineHeight: "36px", fontWeight: 600, letterSpacing: "-0.01em" }
  heading-5: { fontFamily: "Aspekta, system-ui, sans-serif", fontSize: "24px", lineHeight: "32px", fontWeight: 600 }
  heading-6: { fontFamily: "Aspekta, system-ui, sans-serif", fontSize: "20px", lineHeight: "28px", fontWeight: 600 }
  title-1: { fontFamily: "Aspekta, system-ui, sans-serif", fontSize: "20px", lineHeight: "28px", fontWeight: 500 }
  title-3: { fontFamily: "Aspekta, system-ui, sans-serif", fontSize: "16px", lineHeight: "24px", fontWeight: 500 }
  title-4: { fontFamily: "Aspekta, system-ui, sans-serif", fontSize: "14px", lineHeight: "20px", fontWeight: 500 }
  lead: { fontFamily: "Aspekta, system-ui, sans-serif", fontSize: "20px", lineHeight: "28px", fontWeight: 400 }
  body-3: { fontFamily: "Aspekta, system-ui, sans-serif", fontSize: "16px", lineHeight: "24px", fontWeight: 400 }
  body-6: { fontFamily: "Aspekta, system-ui, sans-serif", fontSize: "14px", lineHeight: "20px", fontWeight: 400 }
  button-md: { fontFamily: "Aspekta, system-ui, sans-serif", fontSize: "16px", lineHeight: "24px", fontWeight: 600 }
  button-sm: { fontFamily: "Aspekta, system-ui, sans-serif", fontSize: "14px", lineHeight: "20px", fontWeight: 600 }
  caption-2: { fontFamily: "Aspekta, system-ui, sans-serif", fontSize: "14px", lineHeight: "20px", fontWeight: 400 }
  caption-5: { fontFamily: "IBM Plex Mono, ui-monospace, monospace", fontSize: "12px", lineHeight: "16px", fontWeight: 400 }
  figure: { fontFamily: "IBM Plex Mono, ui-monospace, monospace", fontSize: "48px", lineHeight: "48px", fontWeight: 400 }
  wordmark: { fontFamily: "Boldonse, sans-serif", fontSize: "14px", lineHeight: "20px", fontWeight: 400 }
rounded:
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
spacing:
  s25: "2px"
  s50: "4px"
  s75: "8px"
  s100: "12px"
  s200: "16px"
  s300: "24px"
  s400: "32px"
  s500: "40px"
  s600: "48px"
  s700: "64px"
  s800: "80px"
  s900: "96px"
components:
  button-primary:
    backgroundColor: "{colors.scarlet}"
    textColor: "{colors.navy-deep}"
    typography: "{typography.button-md}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.scarlet-lift}"
  button-solid:
    backgroundColor: "{colors.powder-bright}"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.powder-bright}"
    typography: "{typography.button-md}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.navy-raised}"
    textColor: "{colors.powder}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  tile:
    backgroundColor: "{colors.navy-raised}"
    textColor: "{colors.powder-bright}"
    rounded: "{rounded.xl}"
    padding: "16px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.powder}"
    typography: "{typography.title-4}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "32px"
  chip-on:
    backgroundColor: "{colors.powder-bright}"
    textColor: "{colors.ink}"
  chart:
    backgroundColor: "{colors.navy-deep}"
    textColor: "{colors.powder-dim}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  logo-plate:
    backgroundColor: "{colors.powder-bright}"
    textColor: "{colors.ink}"
    rounded: "4px"
  field:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.powder-bright}"
    typography: "{typography.body-3}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
    height: "40px"
  nav-pill:
    backgroundColor: "rgba(10,26,51,.86)"
    textColor: "{colors.powder}"
    rounded: "{rounded.xl}"
    padding: "8px 8px 8px 16px"
---

# Design System: assumption-drift

This is the main site's DESIGN.md (scndorder-site), copied here and kept in its order. Where a section says "as on the main site" the text is the main site's and the two must not drift. What this site adds is the "Data colours" section and the data components; what it leaves out is grain. Every difference from the main site and from the prototype `P4_composite.html` is listed at the end.

## Overview

**Creative North Star: "The record room at night"**

A dark, quiet room where the only things lit are the things on the record. The ground is navy; type is powder blue, the colour of a filing under a desk lamp. One colour is allowed to be loud, scarlet, and here it is spent on two things only: the request for a company and the count of misses nobody acknowledged.

The main site argues; this site answers. Its first screen is the question, the search and the numbers. Everything after that is the record itself: a company, its statements, the filing behind each one.

**Key Characteristics:**
- Navy ground with two depths, never a background gradient.
- Powder type in three strengths; mono for anything measured or dated.
- Scarlet is rare. The data colours each mean one thing and are never decoration.
- No grain. On the main site grain stands for evidence; here the evidence is on the page, so the only grain left is the square: one per statement in the unit chart, one beside each status, one at the corner of each excerpt.
- One easing curve. Movement is transform and opacity and nothing else.

## Colors

Three families, as on the main site: navy for ground, powder for everything read, scarlet for the single accent. The data colours are a fourth, closed set.

### Primary
- **Scarlet** (`scarlet`): the request button, and the never-acknowledged count wherever it is shown (the figure, and its squares in the unit chart). Text on scarlet is `navy-deep`, which reaches 4.9:1; white reaches only 3.8:1 and is not used.
- **Scarlet lift** (`scarlet-lift`): the hover state of scarlet, faded in as an overlay.

### Neutral
- **Navy** (`navy`): the page ground.
- **Navy deep** (`navy-deep`): the footer and the charts, anything that sits below the ground.
- **Navy raised** (`navy-raised`): cards, tiles and panels, anything that sits above the ground.
- **Powder bright** (`powder-bright`): headings and figures on navy; the active chip; the logo plate.
- **Powder** (`powder`): body text on navy.
- **Powder dim** (`powder-dim`): captions and metadata on navy (5.9:1). The floor for text on navy.
- **Powder ink** (`powder-ink`): the withdrawn mark. As text it fails on navy and is never used there.
- **Ink** (`ink`): text on powder bright (the active chip, a monogram).
- **Line** (`line`): one-pixel hairlines on navy.

### Data colours

Each colour answers one question about a statement and is used for nothing else. A colour never carries the meaning alone: a status is always a square and its name, a bar always has its counts beside it, a chart point always has its row in the table.

| Meaning | Token | Value | Drawn as |
| --- | --- | --- | --- |
| Met: the reported figure landed inside the guided range | `powder` | #BCD3EA | filled square, bar, dot |
| Missed, better than guided | `green` | #5FA57F | filled square, bar, dot, bar segment |
| Missed, worse than guided | `brick` | #B42318 | filled square, bar, dot, bar segment |
| Missed, worse, as a word or a figure | `brick-lift` | #FF9F94 | text only |
| Conflict between sources | `amber` | #C27A12 | filled square. No current row carries one |
| Acknowledged in a later filing | `scarlet`, hollow | #FF2400 | one-pixel outline, never filled |
| Missed and never acknowledged (the count) | `scarlet` | #FF2400 | the figure, and its squares in the unit chart |
| Still open (the field value "unresolved"): no outcome filed yet | `powder-dim`, hollow; `powder` at 15% in the unit chart | #7F9CBF | hollow square, hollow bar |
| Withdrawn | `powder-ink` | #55698A | filled square, bar |

**The Worse Is Brick Rule.** A worse-side miss is brick. It is never scarlet, in a row, a bar or a chart. Scarlet says nobody acknowledged it, which is a different fact.

**The Lifted Brick Rule.** Brick reaches 2.6:1 on navy and 2.9:1 on navy deep. That is enough for a mark that has its name beside it and not enough for text, so the word "worse" and a beyond-range figure take `brick-lift` (8.6:1).

**The Green Is Lighter Here Rule.** The main site's green (#1B7F4B) is drawn on paper. On navy it does not reach 3:1, so this site's green is #5FA57F (6.0:1).

**The Deep Chart Rule.** Charts sit on navy deep, the darkest surface, because that is where every data colour has its best contrast.

### Named Rules
**The Two Scarlets Rule.** Scarlet is the request button and the never-acknowledged count. If a third thing wants to be scarlet, it is wrong. (The hollow scarlet square for an acknowledged miss is the same count's other half.) The footer wordmark's hover letter is the main site's component and is the one inherited exception.

**The No Other Hues Rule.** Navy, powder, scarlet, and the data colours above. Company logos keep their own colours and are confined to a powder plate.

**The Flat Ground Rule.** Backgrounds are flat colour. No gradients, no cursor spotlights, no glows.

## Typography

As on the main site.

**Heading and body font:** Aspekta (self-hosted variable, `app/fonts/aspekta`), with system-ui fallback.
**Mono font:** IBM Plex Mono, for figures, dates, ids, tickers and captions that carry data.
**Wordmark font:** Boldonse, for the words SCND ORDER and nothing else.

### Hierarchy
Every piece of text takes one named style (the Elaya steps). Sizes land on the Tailwind scale; the one exception is listed last.

- **heading-2** (600, 48/48, -0.02em): the home question. 36/40 below 700px.
- **heading-3** (600, 36/40, -0.01em): every other page title. 30/36 below 700px.
- **heading-4** (mono 400, 30/36): the four figures under the search.
- **heading-5** (600, 24/32): section headings inside the write-up; the request panel.
- **heading-6** (600, 20/28): section headings on data pages.
- **title-3** (500, 16/24): chart titles, panel rows, item headings.
- **title-4** (500, 14/20): nav links, chips, rail group names, tile names (600).
- **lead** (400, 20/28): the sentence under a page title; the row summary. 18/28 below 700px.
- **body-3** (400, 16/24) and **body-6** (400, 14/20): running text and table text. Measure 65 to 75 characters.
- **button-md** (600, 16/24) and **button-sm** (600, 14/20): text inside buttons only.
- **caption-2** (400, 14/20): helper text, chart key.
- **caption-5** (mono 400, 12/16): tick labels, legends, counts, ids, table headers (Aspekta 500 at the same size).
- **table figure** (mono 400, 13/20): figures and dates in table cells. Off the scale on purpose: at 14px the company table no longer fits beside the rail at 1280, and at 12px the figures stop being the content.

### Named Rules
**The Sentence Case Rule.** Headings, buttons and labels are sentence case. No capitals as a label style. Tickers are the exception: they are names.

**The Semibold Ceiling Rule.** Nothing heavier than 600. No italics anywhere.

**The Balance Rule.** Headings use `text-wrap: balance`; body uses `text-wrap: pretty`. Heading and lead are capped at 680px.

**The Mono Means Measured Rule.** If it is a figure, a date, an id or a ticker, it is Plex Mono with tabular figures. Aspekta has no tabular figures, so a column of numbers is never set in it.

## Layout

A 1200px container with 24px gutters (16px below 700px). Sections are separated by 96px (64px below 700px); blocks inside a page by 48px.

Spacing takes only the table values: 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96.

The navigation is full width at the top of the page and becomes a centred pill, sized to its content, after 80px of scroll. Below 1080px the links collapse into a full-height panel (the main site collapses at 820px; this bar carries five links and the product label).

The company page is a rail and a column: filters in a 216px rail on the left, charts and the table on the right. The rail collapses to a 44px strip; below 1000px it sits above the column.

A page that is read (the write-up, a row page) is one centred column at the main site's 680px measure, headings included; running text inside it keeps to about 72 characters. Tables in the write-up are centred on the column and may run to the full content width, and the figures in "The record in full" keep it.

The company grid fills its row with as many 208px-minimum tiles as fit, so the same grid holds 15 companies or 50.

At 390px every multi-column grid is one column (the company grid, two) and nothing overflows horizontally. Wide tables scroll inside their own box, with a hint.

## Elevation & Depth

As on the main site. No shadows. Depth is tonal: navy deep sits below the ground, navy raised sits above it, each edged with a one-pixel line. The nav pill is the one translucent surface (86% navy over a 14px backdrop blur), because content passes under it.

**The Tonal Depth Rule.** If something needs to lift, it gets a lighter navy and a hairline. It does not get a shadow.

## Shapes

Tailwind radii only: 8px for buttons, fields and chips; 12px for tiles, panel rows and the nav pill; 16px for cards and charts; 24px for the request panel. The logo plate is 4px (8px at page size). Borders go all the way round or not at all; a list of rows is ruled with hairlines between rows. Data marks are square.

## Components

### Buttons
As on the main site.
- **Shape:** 8px radius, 40px tall, 8px by 12px padding.
- **Primary:** scarlet with navy-deep text. "Request a company", and nothing else. One per screen: the nav's button steps aside while the request form is on screen.
- **Solid:** powder bright with ink text, for the strongest action on a page that is not the request (Compare, Back to all companies).
- **Ghost:** transparent with a one-pixel line (Compare with…, Clear filters).
- **Hover:** a lighter overlay fades in (opacity, 300ms). **Active:** `scale(.98)`. **Focus:** a 2px powder-bright ring offset 3px.

### Plates (company tiles, feed rows, previous and next statement)
As on the main site: on hover a plate rises 2px and a brighter hairline fades in; on press it settles back and scales to .99. 500ms on the base curve. Only things that are links are plates. A card that only holds content does not move.

### Chips (filters)
8px radius, 32px tall (40px on touch), a one-pixel line. Hover: a tint fades in, as on the nav links. On: powder bright with ink text. Press: `scale(.98)`. A chip is a link, and the filter state is the URL. In the company rail a chip is a row of a list and drops its line (an outlined, full-width, left-aligned box reads as an empty field); the tint and the powder fill are unchanged. An active chip has no hover layer.

### Table rows
Hover: the row takes the tint, with no transition. The metric name is the link to the row page. Rows are one line tall; a long metric name is cut short and carried in its title.

### Status
A square in the data colour and the status name. No pill, no fill behind the word.

### Fields
As on the main site: 8px radius, 40px tall, navy fill with a one-pixel line; the line brightens on focus alongside the focus ring. The home search is the one large field: 64px tall, 12px radius, lead type. "/" focuses it, matches are listed under it, and Enter opens the first. Outcomes are written as record entries: a mono status line (green "recorded", brick "not recorded") above a plain sentence.

### Navigation
The main site's component, copied. Wordmark left (to scndorder.com) with the product label beside it (home; dropped from the pill), five links (Companies, Misses, Compare, Methodology, Contact) and the primary button right. About is not in the nav or the panel; it is in the footer's Company column, to scndorder.com/about. The current section's link carries `aria-current` and a filled background. The menu button's three lines fold into a cross. Menu links arrive 60ms apart, rising 24px.

### Footer
The main site's component, copied: link columns, the legal row, and the wordmark fitted to the container on one line as the last thing on the page. Each letter rises once when the mark comes into view; the letter under the pointer goes scarlet.

### Unit chart
The main site's unit chart, rule for rule: one 7-unit square per statement on a 10-unit pitch; the groups in its order (met, acknowledged, never acknowledged, still open) with the hollow group half a unit inside its cell; a mono legend carrying the counts in the same order and colour. The figure rises 32px once when it enters the viewport and the groups come up 200ms apart. Point at a figure (a legend count, or one of the four under the search) or at a group, and the other groups step back to 12%; still open rests at 15%, is never stepped below it, and its own figure lifts it to 60%. Beside the misses feed the chart and the feed are one row with a shared top and bottom edge and level heading baselines: the columns are computed so the grid fills its column's width and is as tall as the room above the legend, and the square size follows (alone in a column, or with scripting off, it keeps the main site's 1.68 proportion). Two differences from the main site: that fitting, and withdrawn statements are a fifth group of their own here, where the main site counts them in with still open, and a line under the legend says so.

### Charts
One metric over time. A bar is the guided range on the date it was stated; a dot is the reported figure on the outcome date, joined to its bar by a thin line unless they touch. Three to five gridlines at round values. One tick per fiscal year, shared by every chart of a company. A still-open statement is a hollow bar with no dot. When the axis is trimmed the chart says so and counts the points beyond it. When a rail filter is on, points that do not match are dimmed, not removed.

### Logos
A brand symbol where the brand has one, a wordmark otherwise, scaled to fit a height and a width and never stretched. A logo that would fit under 14px tall is replaced by a monogram: the first two letters of the ticker, ink on powder. Every logo and monogram sits on a powder plate.

## Do's and Don'ts

### Do:
- **Do** compute every figure from the release file through `app/lib/data`. Nothing is typed into a component.
- **Do** use `cubic-bezier(.22,1,.36,1)` for every transition: 500ms for position, 300ms for hover fades.
- **Do** animate only `transform` and `opacity`. A colour change is two layers and an opacity fade.
- **Do** drop movement to a plain opacity change under `prefers-reduced-motion`.
- **Do** quote an excerpt exactly as filed, inside its hairline.

### Don't:
- **Don't** add a hue. Not for charts, not for states.
- **Don't** use scarlet for a worse-side miss.
- **Don't** put white text on scarlet; it fails contrast.
- **Don't** use gradients on backgrounds or on text.
- **Don't** put a border on one side of a card.
- **Don't** add grain, a canvas or a scroll reveal to a data page. The unit chart's reveal is the main site's and is the one exception.
- **Don't** invent a fact, and do not round one.

## Changes against the main site

The main site wins wherever it and the prototype disagree. These are the places this site differs from the main site, each on purpose.

- **Green** is #5FA57F, not #1B7F4B: the main site's green sits on paper and does not reach 3:1 on navy.
- **Brick lift** (#FF9F94) and **amber** (#C27A12) are added, as data colours. Brick itself is unchanged.
- **Nav:** this site's links; the wordmark goes to scndorder.com and the product label beside it goes home; the route comes from `usePathname` because the nav sits in the layout; the button steps aside for `#request` instead of `#access`; the links collapse at 1080px instead of 820px. The panel's links are 12px apart instead of 16px so six of them fit a short screen.
- **Footer:** this site's lead sentence and links; the lead button is the ghost "Request a company"; the "Cookie settings" link is the main site's and, as there, renders only when GA4 is configured.
- **Consent banner:** the main site's component and copy on this site's classes (`.consent`, `.btn.sm`): navy raised, the 40% line, 12px radius, solid powder "Accept analytics" and ghost "Decline". Its Privacy Policy link goes to scndorder.com/privacy. The analytics scripts carry the page's CSP nonce, and gtag.js is not requested from Google until the visitor accepts (the main site loads it on every visit under a denied consent default).
- **Field edge** is powder dim, not the 40% line: the 40% line reaches 2.8:1 against navy and navy raised, under the 3:1 a control's edge needs.
- **No grain, no paper sheet.** Two things reveal on scroll, both the main site's own: the footer wordmark and the unit chart.
- **Nav on first load.** The first script in `<body>` reads the scroll position before the nav's markup exists and writes `html[data-nav]`; the compact rules read it until the component mounts, and nothing in the nav animates for the first 300ms. A page that loads already scrolled paints the pill in its first frame. The main site sets the state after hydration.
- **Table figures** are 13px mono, the one size off the scale (see Typography).
- **The inline script** that marks `html[data-js]` carries the page's CSP nonce.

## Changes against the prototype

Kept: the home order (question, search, pilot line, figures, unit chart beside the misses feed, company tiles), the company page's rail and column, the three-line toggle and the 44px strip.

- **Type** is Aspekta on the main site's steps. The prototype's Manrope, 22px search text, 13px chips and 11px captions are gone.
- **No cursor spotlight and no shadow under the search box.** Flat ground; depth is tonal.
- **Scarlet button text** is navy-deep, not white. **Focus rings** are powder, not scarlet.
- **The never-acknowledged figure** is scarlet (#FF2400), not the lifted scarlet the prototype used.
- **Nav** is the main site's transform-only layout animation; the prototype transitioned max-width, padding, radius and margin.
- **The rail** does not animate its width (the prototype transitioned `grid-template-columns`): its contents fade in. Its state is in the URL (`rail=0`), and the strip shows the number of filters that are on, in mono, with their names in its tooltip.
- **The rail drives the charts.** Metric chooses which charts are drawn; status and fiscal year dim the points that do not match, and the section says how many match. The prototype's charts ignored the rail.
- **One set of filters.** The prototype repeated metric and status as a chip row above the table.
- **Chips and status** are not pills: chips are 8px rectangles, a status is a square and a word. The prototype's 999px pills and tinted status tags are the stock look of a generated dashboard.
- **The "⌘K" hint** did nothing in the prototype. Here "/" focuses the search, and the hint shows that key.
- **The feed and the unit chart are computed.** The prototype's four misses were typed in and skipped the third largest (Salesforce, EPS GAAP, Q4 FY2023); its unit chart lumped withdrawn statements in with unresolved. Here the feed is the top of /misses and the chart has five groups that sum to the total.
- **The charts are the real ones** (the prototype's were labelled illustrative), on navy deep instead of navy raised.
- **The bar** on a tile and on the company page is drawn as a share of that company's statements, as the prototype drew it; before, the two segments filled the bar between them.
- **Tiles** carry the logo left of the ticker (the existing rule), the sector on its own line, and the full counts sentence. The grid fills its row instead of fixing five columns, and has sector and order chips.
- **Logos** sit on a powder plate; the prototype showed monograms only.
- **The home lead** is this site's existing sentence, not the prototype's rewording of it.
