"use client";

import { useEffect, useRef } from "react";

// Footer wordmark, fitted to the full container width on one line.
// It measures the text run (a Range over the letters), sizes at a 100px probe and scales by
// container / measured width. Both the fitted size and the "has come into view" flag are written to
// <html>, not to the footer, so the footer's markup stays byte-identical across routes.
// Each letter is its own element so it can rise in turn and go hot under the pointer (see globals.css).
export default function FooterMark({ text }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const box = el.parentElement;
    const root = document.documentElement;

    function fit() {
      const cs = getComputedStyle(box);
      const target = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      root.style.setProperty("--sf-mark-size", "100px");
      const range = document.createRange();
      range.selectNodeContents(el);
      const w = range.getBoundingClientRect().width;
      if (w > 0 && target > 0) root.style.setProperty("--sf-mark-size", `${(100 * target) / w}px`);
    }

    let cancelled = false;
    document.fonts.ready.then(() => { if (!cancelled) fit(); });
    window.addEventListener("resize", fit);

    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      root.dataset.footIn = "";
      io.disconnect();
    }, { threshold: 0.2 });
    io.observe(box);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", fit);
      io.disconnect();
    };
  }, []);

  return (
    <div className="sf-mark" aria-hidden="true">
      <span ref={ref} className="sf-mark-run">
        {[...text].map((c, i) => (
          <i key={i} data-c={c}>{c}</i>
        ))}
      </span>
    </div>
  );
}
