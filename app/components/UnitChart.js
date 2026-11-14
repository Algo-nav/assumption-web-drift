"use client";

import { useLayoutEffect, useRef, useState } from "react";

// The main site's unit chart (scndorder-site app/components/Drift.js, unitChart): one 7-unit square per
// statement on a 10-unit pitch, each group one SVG path, in the main site's order: met, acknowledged, silent
// (missed and never acknowledged), open. Two things differ here:
// - withdrawn statements are a fifth group of their own, drawn last (the main site counts them in with still
//   open), and the line under the legend says so;
// - the number of columns is not fixed. Beside the misses feed the chart shares the feed's top and bottom edge,
//   so the columns are chosen to fill the box it is given: the grid is as wide as its column, and the fewest
//   columns that keep it no taller than the room left above the legend. The square size follows from that.
//   With no box to fill (one column of page, or scripting off) it falls back to the main site's proportion.
const PITCH = 10;
const SIZE = 7;
const span = (count) => count * PITCH - (PITCH - SIZE);

// The main site's grid: about 1.68 times as wide as it is tall.
export const defaultCols = (total) => Math.round(Math.sqrt(total * 1.68));

// The fewest columns whose grid, drawn `width` wide, is at most `height` tall.
export function fitCols(total, width, height) {
  if (!(width > 0) || !(height > 0)) return defaultCols(total);
  for (let cols = 1; cols <= total; cols++) {
    if ((width * span(Math.ceil(total / cols))) / span(cols) <= height) return cols;
  }
  return total;
}

// `groups` is [{ g, n, label, stat }] in drawing order; `note` is a line under the legend.
export default function UnitChart({ groups, total, note }) {
  const figure = useRef(null);
  const plot = useRef(null);
  const [cols, setCols] = useState(() => defaultCols(total));

  useLayoutEffect(() => {
    const fig = figure.current;
    const box = plot.current;
    if (!fig || !box) return;
    const row = fig.closest(".heat");
    const measure = () => {
      // Side by side with the feed only when the row has two tracks.
      const beside = row && getComputedStyle(row).gridTemplateColumns.split(" ").length > 1;
      if (!beside) {
        fig.removeAttribute("data-fit");
        setCols(defaultCols(total));
        return;
      }
      // In fit mode the plot is whatever height the row leaves above the legend (see .units[data-fit]).
      fig.setAttribute("data-fit", "");
      const { width, height } = box.getBoundingClientRect();
      setCols(fitCols(total, width, height));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    if (row) observer.observe(row);
    return () => observer.disconnect();
  }, [total]);

  const rows = Math.ceil(total / cols);
  const fmt = (n) => n.toLocaleString("en-US");
  const paths = groups.map(({ g, n }, i) => {
    const from = groups.slice(0, i).reduce((sum, o) => sum + o.n, 0);
    // The acknowledged group is drawn as outlines, half a unit inside the cell so the stroke stays within it.
    const inset = g === "acknowledged" ? 0.5 : 0;
    const side = SIZE - 2 * inset;
    let d = "";
    for (let at = from; at < from + n; at++) {
      d += `M${(at % cols) * PITCH + inset} ${Math.floor(at / cols) * PITCH + inset}h${side}v${side}h-${side}z`;
    }
    return { g, n, d };
  });
  return (
    <figure ref={figure} className="units" data-reveal data-testid="unit-chart" data-cols={cols}>
      <div ref={plot} className="units-plot">
        <svg
          viewBox={`0 0 ${span(cols)} ${span(rows)}`}
          role="img"
          aria-label={`${fmt(total)} guidance statements, one square each: ${groups.map((g) => `${fmt(g.n)} ${g.label}`).join("; ")}.`}
        >
          {paths.map(({ g, n, d }) => (n ? <path key={g} d={d} data-g={g} data-n={n} /> : null))}
        </svg>
      </div>
      <figcaption>
        <ul className="units-legend caption-5 mono">
          {groups.map(({ g, n, label, stat }) => (
            <li key={g} data-g={g}><i aria-hidden="true" /><b data-stat={stat}>{fmt(n)}</b> {label}</li>
          ))}
        </ul>
        {note ? <p className="units-note caption-5 mono" data-testid="unit-note">{note}</p> : null}
      </figcaption>
    </figure>
  );
}
