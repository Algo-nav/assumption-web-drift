import { NextResponse } from "next/server";
import { getRequestsDb } from "@/app/lib/db";
import { clientIp } from "@/app/lib/client-ip";
import { recordRequest } from "@/app/lib/requests-store";
import {
  REQUEST_ROLES,
  REQUESTS_PER_IP_PER_HOUR,
  REQUESTS_PER_DAY,
  MAX_REQUEST_BODY_BYTES,
  MAX_REQUEST_FIELD_CHARS,
} from "@/app/lib/site";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELDS = ["company", "email", "role", "website"];

class BodyTooLarge extends Error {}

// Reads the body but stops as soon as it passes the cap, so a chunked body cannot be buffered whole.
async function readCappedText(request) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BODY_BYTES) throw new BodyTooLarge();
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REQUEST_BODY_BYTES) {
      await reader.cancel();
      throw new BodyTooLarge();
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(request) {
  let payload;
  try {
    payload = JSON.parse(await readCappedText(request));
  } catch (err) {
    if (err instanceof BodyTooLarge) {
      return NextResponse.json({ error: "Request too large." }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Every string field is capped before anything else looks at it, the honeypot included.
  for (const key of FIELDS) {
    if (typeof payload?.[key] === "string" && payload[key].length > MAX_REQUEST_FIELD_CHARS) {
      return NextResponse.json({ error: "A field is too long." }, { status: 400 });
    }
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
  if (!EMAIL_RE.test(email) || email.length > MAX_REQUEST_FIELD_CHARS) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (!REQUEST_ROLES.includes(role)) {
    return NextResponse.json({ error: "Pick a role." }, { status: 400 });
  }

  const ip = clientIp(request.headers);

  let outcome;
  try {
    const db = getRequestsDb();
    if (!db) throw new Error("no database");
    outcome = recordRequest(db, {
      company,
      email,
      role,
      ip,
      perIpPerHour: REQUESTS_PER_IP_PER_HOUR,
      perDay: REQUESTS_PER_DAY,
    });
  } catch {
    return NextResponse.json({ error: "requests unavailable" }, { status: 503 });
  }

  // When the daily total is spent the form is closed for everyone, same as a broken database.
  if (outcome === "day") return NextResponse.json({ error: "requests unavailable" }, { status: 503 });
  if (outcome === "hour") {
    return NextResponse.json({ error: "Too many requests. Try again in an hour." }, { status: 429 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
