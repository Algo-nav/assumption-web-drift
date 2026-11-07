import Link from "next/link";
import Wordmark from "./Wordmark";
import { X_URL, LINKEDIN_URL, SITE_NAME, MAIN_URL, ABOUT_URL, CONTACT_URL } from "../lib/site";

const follow = [
  ["X", X_URL],
  ["LinkedIn", LINKEDIN_URL],
].filter(([, href]) => href);

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <nav aria-label="Footer" className="footer-cols">
          <div className="footer-lead">
            <h2 className="footer-h">{SITE_NAME}</h2>
            <p>Guidance from 8-K earnings releases, matched to what was reported, with the filings to check.</p>
            <Link href="/#request" className="btn btn-cta">Request a company</Link>
          </div>
          <div>
            <h2 className="footer-h">Product</h2>
            <Link href="/">assumption-drift</Link>
            <Link href="/misses">Misses</Link>
            <Link href="/methodology">Methodology</Link>
            <Link href="/#request">Request a company</Link>
          </div>
          <div>
            <h2 className="footer-h">Company</h2>
            <a href={MAIN_URL}>scndorder.com</a>
            <a href={ABOUT_URL}>About</a>
            <a href={CONTACT_URL}>Contact</a>
          </div>
          {follow.length > 0 && (
            <div>
              <h2 className="footer-h">Follow</h2>
              {follow.map(([label, href]) => (
                <a key={label} href={href}>{label}</a>
              ))}
            </div>
          )}
        </nav>
        <div className="footer-legal small">
          <a href="https://scndorder.com/privacy">Privacy</a>
          <a href="https://scndorder.com/terms">Terms</a>
          <span className="mono footer-copy">© {new Date().getFullYear()} {SITE_NAME}</span>
        </div>
        <div className="footer-mark" aria-hidden="true">
          <Wordmark>SCND ORDER</Wordmark>
        </div>
      </div>
    </footer>
  );
}
