import fs from "node:fs";
import path from "node:path";

export function readRecords() {
  const file = path.join(process.cwd(), "data", "release.jsonl");
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}
