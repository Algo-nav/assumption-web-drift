import { isIP } from "node:net";

// The rate-limit identity. Only the last x-forwarded-for entry is used: that is the hop the platform proxy
// appended, so a client cannot choose it. x-real-ip is deliberately ignored because nothing in this repo
// guarantees the proxy overwrites a client-supplied value.
//
// When the header is absent (no proxy), Next's server fills x-forwarded-for with the socket address before the
// route handler runs (node_modules/next/dist/server/base-server.js, "x-forwarded-for" ??= socket.remoteAddress),
// so reading the header also covers the socket-address case. If neither exists the caller is bucketed as "unknown".
//
// IPv6 clients are keyed by their /64, because one subscriber normally holds a whole /64 and could otherwise
// rotate through addresses for fresh buckets. All spellings of an address (case, leading zeros, "::" compression,
// brackets, zone id, IPv4-mapped form) collapse to one key.

// Expands a valid IPv6 string (no zone, no brackets) to its eight 16-bit groups.
function ipv6Groups(addr) {
  let text = addr;
  // An embedded dotted IPv4 tail becomes two hextets.
  const v4 = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (v4) {
    const [a, b, c, d] = v4.slice(1).map(Number);
    text = text.slice(0, v4.index) + ((a << 8) | b).toString(16) + ":" + ((c << 8) | d).toString(16);
  }
  const [head, tail] = text.split("::");
  const left = head ? head.split(":") : [];
  const right = tail === undefined ? [] : tail ? tail.split(":") : [];
  const fill = tail === undefined ? [] : Array(8 - left.length - right.length).fill("0");
  return [...left, ...fill, ...right].map((g) => parseInt(g, 16));
}

export function normaliseIp(raw) {
  let text = String(raw).trim();
  // "[2001:db8::1]:443" -> "2001:db8::1"
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(text);
  if (bracketed) text = bracketed[1];
  // Zone id: "fe80::1%eth0" -> "fe80::1"
  text = text.replace(/%.*$/, "");

  if (isIP(text) !== 6) return text.slice(0, 64); // IPv4, "unknown", or anything else: used as sent
  const g = ipv6Groups(text);
  // IPv4-mapped (::ffff:a.b.c.d): the same client as its IPv4 address.
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) {
    return `${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`;
  }
  return `${g.slice(0, 4).map((x) => x.toString(16)).join(":")}::/64`;
}

export function clientIp(headers) {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const last = fwd.split(",").pop().trim();
    if (last) return normaliseIp(last);
  }
  return "unknown";
}
