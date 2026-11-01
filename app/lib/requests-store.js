// Limit check and insert in one write transaction, so two concurrent requests (same process or another
// process sharing the database file) cannot both pass the count and both insert.
// Returns "ok", "day" (the form is closed for everyone) or "hour" (this IP is over its limit).
export function recordRequest(db, { company, email, role, ip, now = Date.now(), perIpPerHour, perDay }) {
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const run = db.transaction(() => {
    const day = db.prepare("SELECT COUNT(*) AS n FROM company_requests WHERE created_at > ?").get(dayAgo).n;
    if (day >= perDay) return "day";
    const hour = db.prepare("SELECT COUNT(*) AS n FROM company_requests WHERE ip = ? AND created_at > ?").get(ip, hourAgo).n;
    if (hour >= perIpPerHour) return "hour";
    const result = db
      .prepare("INSERT INTO company_requests (company, email, role, created_at, ip) VALUES (?, ?, ?, ?, ?)")
      .run(company, email, role, new Date(now).toISOString(), ip);
    if (result.changes !== 1) throw new Error("insert did not store a row");
    return "ok";
  });
  // BEGIN IMMEDIATE takes the write lock before the first count is read.
  return run.immediate();
}
