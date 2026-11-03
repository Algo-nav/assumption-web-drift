"use client";

import { useEffect, useRef } from "react";

// Smallest size the fitted wordmark may take. The fit never wraps the line; it only shrinks the type.
const MIN_PX = 24;

// The footer wordmark, fitted to the full width of its box on one line. The CSS sets a viewport-based
// size first so the server render is close; this refines it once the font has loaded and on every resize.
// A client component instead of an inline script, so the CSP nonce covers it through Next's own chunks.
export default function Wordmark({ children }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return;
    let frame = 0;
    const fit = () => {
      el.style.fontSize = "100px";
      const w = el.getBoundingClientRect().width;
      if (w > 0) el.style.fontSize = `${Math.max(MIN_PX, (100 * box.clientWidth) / w)}px`;
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();
    document.fonts?.ready.then(schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(box);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <span ref={ref} className="footer-mark-text boldonse">
      {children}
    </span>
  );
}
