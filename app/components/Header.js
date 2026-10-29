import Link from "next/link";
import { PRODUCT_NAME } from "../lib/site";

export default function Header() {
  return (
    <header style={{ borderBottom: "1px solid var(--line)" }}>
      <div className="wrap" style={{ paddingTop: 16, paddingBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "8px 24px" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 12px" }}>
            <span className="boldonse" style={{ fontSize: "0.875rem", letterSpacing: "0.02em" }}>SCND ORDER</span>
            <span className="mono" style={{ color: "var(--faint)" }}>{PRODUCT_NAME}</span>
          </Link>
          <nav aria-label="Main" style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", fontSize: "0.9375rem" }}>
            <Link href="/">Companies</Link>
            <Link href="/compare">Compare</Link>
            <Link href="/methodology">Methodology</Link>
            <Link href="/about">About</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
