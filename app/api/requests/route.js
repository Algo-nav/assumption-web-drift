import { NextResponse } from "next/server";
import { getRequestsDb } from "@/app/lib/db";
import { REQUEST_ROLES, REQUESTS_PER_IP_PER_HOUR, REQUESTS_PER_DAY } from "@/app/lib/site";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Railway's proxy sets x-real-ip. Failing that, the last x-forwarded-for entry is the one the proxy added.
function clientIp(request) {
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",").pop().trim();
  return "unknown";
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const company = typeof payload?.company === "string" ? payload.company.trim() : "";
  const email = typeof payload?.email === "string" ? payload.email.trim() : "";
  const role = typeof payload?.role === "string" ? payload.role : "";

  // Honeypot: real visitors never see this field. Pretend it worked, store nothing.
  if (typeof payload?.website === "string" && payload.website !== "") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (!company || company.length > 120) {
    return NextResponse.json({ error: "Enter a company name or ticker." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (!REQUEST_ROLES.includes(role)) {
    return NextResponse.json({ error: "Pick a role." }, { status: 400 });
  }

  const ip = clientIp(request);
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  let result;
  try {
    const db = getRequestsDb();
    if (!db) throw new Error("no database");

    // Daily total first: when it is spent the form is closed for everyone, same as a broken database.
    const day = db.prepare("SELECT COUNT(*) AS n FROM company_requests WHERE created_at > ?").get(dayAgo).n;
    if (day >= REQUESTS_PER_DAY) {
      return NextResponse.json({ error: "requests unavailable" }, { status: 503 });
    }
    const hour = db
      .prepare("SELECT COUNT(*) AS n FROM company_requests WHERE ip = ? AND created_at > ?")
      .get(ip, hourAgo).n;
    if (hour >= REQUESTS_PER_IP_PER_HOUR) {
      return NextResponse.json({ error: "Too many requests. Try again in an hour." }, { status: 429 });
    }

    result = db
      .prepare("INSERT INTO company_requests (company, email, role, created_at, ip) VALUES (?, ?, ?, ?, ?)")
      .run(company, email, role, new Date(now).toISOString(), ip);
  } catch {
    return NextResponse.json({ error: "requests unavailable" }, { status: 503 });
  }

  if (result.changes !== 1) {
    return NextResponse.json({ error: "requests unavailable" }, { status: 503 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
