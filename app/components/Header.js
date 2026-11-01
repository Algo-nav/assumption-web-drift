import Link from "next/link";
import { PRODUCT_NAME } from "../lib/site";

export default function Header() {
  return (
    <header className="site-header">
      <div className="wrap bar">
        <Link href="/" className="brand">
          <span className="boldonse" style={{ fontSize: "var(--fs-m)", letterSpacing: "0.02em" }}>SCND ORDER</span>
          <span className="mono small brand-product">{PRODUCT_NAME}</span>
        </Link>
        <nav aria-label="Main" className="nav">
          <Link href="/">Companies</Link>
          <Link href="/compare">Compare</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/about">About</Link>
        </nav>
        <Link href="/#request" className="btn btn-cta btn-sm">Request a company</Link>
      </div>
    </header>
  );
}
