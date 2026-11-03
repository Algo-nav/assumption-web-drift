import Link from "next/link";
import Wordmark from "./Wordmark";
import { DATASET_URL, X_URL, LINKEDIN_URL, SITE_NAME } from "../lib/site";

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
            <a href="https://scndorder.com">scndorder.com</a>
            <Link href="/about">About</Link>
            <a href="mailto:contact@scndorder.com">Contact</a>
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
          <p>
            Dataset: <a href={DATASET_URL}>assumption-drift</a>, licensed CC-BY-4.0.
          </p>
          <p>
            Source: filings on <a href="https://www.sec.gov/edgar">SEC EDGAR</a>. Each row links to the filing it came from.
          </p>
          <span className="mono footer-copy">© {new Date().getFullYear()} {SITE_NAME}</span>
        </div>
        <div className="footer-mark" aria-hidden="true">
          <Wordmark>SCND ORDER</Wordmark>
        </div>
      </div>
    </footer>
  );
}
