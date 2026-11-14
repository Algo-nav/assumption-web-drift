"use client";

import { usePathname } from "next/navigation";

// The address that was asked for, shown on the 404 entry.
export default function NotFoundPath() {
  const pathname = usePathname();
  return <p className="entry-meta" data-testid="not-found-path">404, {pathname}</p>;
}
