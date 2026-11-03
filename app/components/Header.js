import Link from "next/link";
import { PRODUCT_NAME } from "../lib/site";

export default function Header() {
  return (
    <header className="site-header">
      <div className="wrap bar">
        <div className="brand">
          <a href="https://scndorder.com" className="brand-mark boldonse">SCND ORDER</a>
          <Link href="/" className="mono small brand-product">{PRODUCT_NAME}</Link>
        </div>
        <nav aria-label="Main" className="nav">
          <Link href="/">Companies</Link>
          <Link href="/misses">Misses</Link>
          <Link href="/compare">Compare</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/about">About</Link>
        </nav>
        <Link href="/#request" className="btn btn-cta btn-sm">Request a company</Link>
      </div>
    </header>
  );
}
