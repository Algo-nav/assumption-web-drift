"use client";

import { useEffect, useRef, useState } from "react";

// A sideways-scrolling table box. The hint above and the fade at the right edge show only while the table is
// wider than the box, measured with a ResizeObserver on both, so the cue follows the real fit at every width
// rather than a breakpoint. Without JavaScript the table still scrolls; it just has no cue.
export default function TableScroll({ children }) {
  const ref = useRef(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const check = () => setOverflows(box.scrollWidth > box.clientWidth + 1);
    const observer = new ResizeObserver(check);
    observer.observe(box);
    if (box.firstElementChild) observer.observe(box.firstElementChild);
    check();
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <p className="scroll-hint small faint" hidden={!overflows}>Scroll sideways for more columns</p>
      <div ref={ref} className="table-scroll" data-overflows={overflows ? "" : undefined}>
        {children}
      </div>
    </>
  );
}
