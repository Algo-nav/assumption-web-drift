import Link from "next/link";
import {
  ABOUT_URL,
  CONTACT_URL,
  LINKEDIN_URL,
  MAIN_URL,
  PRIVACY_URL,
  PRODUCT_NAME,
  SITE_NAME,
  TERMS_URL,
  X_URL,
} from "../lib/site";
import FooterMark from "./FooterMark";

// The main site's footer (scndorder-site app/components/Footer.js), copied in: link columns, legal row, and
// the full-width Boldonse wordmark as the last thing on the page. Styles live in globals.css under
// "site footer" (sf-* classes). Every route renders identical markup; nothing here may write state into the
// footer's own DOM.
//
// What differs from the main site: the Product links stay on this site, the Company links go to the main
// site, the lead is this site's own sentence and its button is the request form, and there is no cookie
// settings link because this site sets no cookies.

const columns = [
  {
    title: "Product",
    links: [
      [PRODUCT_NAME, "/"],
      ["Misses", "/misses"],
      ["Methodology", "/methodology"],
      ["Request a company", "/#request"],
    ],
  },
  {
    title: "Company",
    links: [
      ["scndorder.com", MAIN_URL],
      ["About", ABOUT_URL],
      ["Contact", CONTACT_URL],
    ],
  },
  {
    title: "Follow",
    links: [
      ["X", X_URL],
      ["LinkedIn", LINKEDIN_URL],
    ].filter(([, href]) => href),
  },
].filter((col) => col.links.length > 0);

const FootLink = ({ href, children, ...rest }) =>
  href.startsWith("/") ? <Link href={href} {...rest}>{children}</Link> : <a href={href} {...rest}>{children}</a>;

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="sf">
      <div className="sf-wrap">
        <div className="sf-cols">
          <div className="sf-lead">
            <h2>{SITE_NAME}</h2>
            <p>Guidance from 8-K earnings releases, matched to what was reported, with the filings to check.</p>
            <Link className="btn ghost" href="/#request">Request a company</Link>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h2>{col.title}</h2>
              {col.links.map(([label, href]) => (
                <FootLink key={label} href={href}>{label}</FootLink>
              ))}
            </div>
          ))}
        </div>
        <div className="sf-legal">
          <a href={PRIVACY_URL}>Privacy</a>
          <a href={TERMS_URL}>Terms</a>
          <span className="sf-copy">{`© ${year} ${SITE_NAME}`}</span>
        </div>
        <FooterMark text={SITE_NAME.toUpperCase()} />
      </div>
    </footer>
  );
}
