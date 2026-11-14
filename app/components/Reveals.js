"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// One observer for every [data-reveal] on the page. An element rises and fades in the first time it
// enters the viewport and is then left alone; it does not replay on the way back up.
export default function Reveals() {
  const pathname = usePathname();

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    document.querySelectorAll("[data-reveal]:not(.in)").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
