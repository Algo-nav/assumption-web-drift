"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, MotionConfig } from "motion/react";
import InlineScript from "./InlineScript";
import { CONTACT_URL, MAIN_URL, PRODUCT_NAME } from "../lib/site";

// The main site's nav (scndorder-site app/components/SiteNav.js), copied in. Full width at the top of the
// page; after 80px of scroll it eases into a centred pill sized to its content. The move is a layout
// animation (transforms only): the wordmark, the links and the button each travel to their new place while
// the pill surface fades in behind them.
//
// What differs from the main site, and nothing else:
// - the links are this site's, and the route comes from usePathname because the nav sits in the layout;
// - the wordmark goes to scndorder.com, and the product label beside it goes home (dropped from the pill);
// - the button is "Request a company" and steps aside while the request form (#request) is on screen;
// - the links collapse into the panel at 1080px, not 820px: five links and the label need the room.
const EASE = [0.22, 1, 0.36, 1];
const PILL = { borderRadius: 12 };
const NAV_COLLAPSE = 1080;

// The nav's state before React is on the page. The first script in <body> (layout.js, NAV_BOOT) reads scrollY
// before the nav's markup exists, writes html[data-nav], and keeps it right on every scroll while the page
// loads; the CSS draws the pill from that attribute, so a page that loads already scrolled (a reload, a back
// navigation, a #hash) paints the pill in its first frame. The one-line script after the nav copies the state
// onto the wrapper itself, and the component takes over when it mounts (window.__navBoot).
const SYNC = "window.__navSync&&window.__navSync()";
// For this long after mount nothing in the nav animates, so the first state never travels into place.
const BOOT_MS = 300;
const STILL = { duration: 0 };
const MOVE = { duration: 0.6, ease: EASE };

// What the boot script found. On the server, and on a client render with no markup yet, the bar is full.
function bootCompact() {
  return typeof document !== "undefined" && document.documentElement.dataset.nav === "compact";
}

const LINKS = [
  { href: "/", label: "Companies", match: (p) => p === "/" || p.startsWith("/company/") },
  { href: "/misses", label: "Misses", match: (p) => p.startsWith("/misses") },
  { href: "/compare", label: "Compare", match: (p) => p.startsWith("/compare") },
  { href: "/methodology", label: "Methodology", match: (p) => p.startsWith("/methodology") },
  { href: CONTACT_URL, label: "Contact" },
];
const REQUEST = "/#request";

function NavLink({ href, current, children, ...rest }) {
  const props = { "aria-current": current ? "page" : undefined, ...rest };
  // Links to the main site are plain anchors; links inside this site go through the router.
  return href.startsWith("/") ? <Link href={href} {...props}>{children}</Link> : <a href={href} {...props}>{children}</a>;
}

export default function SiteNav({ nonce }) {
  const pathname = usePathname() || "/";
  const home = pathname === "/";

  const [compact, setCompact] = useState(bootCompact);
  const [booting, setBooting] = useState(true);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState({ at: null, on: false });
  const sentinel = useRef(null);
  const menuButton = useRef(null);
  const panel = useRef(null);

  // The sentinel is the first 80px of the page. When it leaves the viewport the nav compacts.
  useEffect(() => {
    // A callback can carry several queued entries; the last one is the current state.
    const io = new IntersectionObserver((entries) => setCompact(!entries[entries.length - 1].isIntersecting));
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, []);

  // Take over from the boot script: from here React owns data-compact, and html[data-nav-live] releases the
  // CSS that held the pill surface visible before motion was on the page.
  useEffect(() => {
    window.__navSync?.();
    window.__navBoot?.();
    document.documentElement.dataset.navLive = "";
    const t = setTimeout(() => setBooting(false), BOOT_MS);
    return () => clearTimeout(t);
  }, []);

  // On the home page, step the nav's button aside while the form it points at is on screen. The observation
  // is kept with the route it was made on, so it lapses on its own when the route changes.
  useEffect(() => {
    const form = document.getElementById("request");
    if (!form) return;
    const io = new IntersectionObserver(
      (entries) => setSeen({ at: pathname, on: entries[entries.length - 1].isIntersecting }),
      { threshold: 0.25 }
    );
    io.observe(form);
    return () => io.disconnect();
  }, [pathname]);
  const asking = seen.at === pathname && seen.on; // the request form is in the viewport

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      // Keep focus between the menu button and the panel's links while the panel is open.
      const items = [menuButton.current, ...panel.current.querySelectorAll("a")];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onResize = () => window.innerWidth > NAV_COLLAPSE && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      root.style.overflow = before;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <MotionConfig reducedMotion="user" transition={booting ? STILL : MOVE}>
      <div ref={sentinel} className="nav-sentinel" aria-hidden="true" />
      <header className="navwrap" data-testid="site-nav" data-compact={compact} suppressHydrationWarning>
        <nav className="nav" aria-label="Main">
          <motion.div
            layout
            className="nav-bg"
            aria-hidden="true"
            initial={false}
            style={PILL}
            animate={{ opacity: compact ? 1 : 0 }}
          />
          <motion.div layout="position" className="nav-brand">
            <a href={MAIN_URL} className="nav-mark" onClick={close}>
              <span className="boldonse">SCND ORDER</span>
            </a>
            <Link href="/" className="nav-label" aria-current={home ? "page" : undefined} onClick={close}>
              {PRODUCT_NAME}
            </Link>
          </motion.div>
          <motion.ul layout="position" className="nav-links">
            {LINKS.map(({ href, label, match }) => (
              <li key={label}>
                <NavLink href={href} current={match?.(pathname)}>{label}</NavLink>
              </li>
            ))}
          </motion.ul>
          <motion.div layout="position" className="nav-cta" data-away={asking} inert={asking}>
            <Link className="btn sm" href={REQUEST}>Request a company</Link>
          </motion.div>
          <button
            ref={menuButton}
            type="button"
            className="nav-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="nav-panel"
            onClick={() => setOpen((v) => !v)}
          >
            <i /><i /><i />
          </button>
        </nav>
      </header>
      <InlineScript nonce={nonce} html={SYNC} />
      <div ref={panel} id="nav-panel" className="nav-panel" data-open={open} inert={!open}>
        <ul>
          {LINKS.map(({ href, label, match }, i) => (
            <li key={label} style={{ "--d": `${Math.min(i * 60, 400)}ms` }}>
              <NavLink href={href} current={match?.(pathname)} onClick={close}>{label}</NavLink>
            </li>
          ))}
          <li style={{ "--d": `${Math.min(LINKS.length * 60, 400)}ms` }}>
            <Link className="btn" href={REQUEST} onClick={close}>Request a company</Link>
          </li>
        </ul>
      </div>
    </MotionConfig>
  );
}
