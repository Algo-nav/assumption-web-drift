// The only file that knows where rows come from. Swap this for a Postgres reader later:
// keep the export `loadRawRecords()` returning an array of research_record objects
// (the published jsonl shape) and nothing else in the app changes.
import fs from "node:fs";
import path from "node:path";

export function loadRawRecords() {
  const file = process.env.DATA_FILE || path.join(process.cwd(), "data", "release.jsonl");
  const text = fs.readFileSync(file, "utf8");
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

export function loadWriteup() {
  const file = process.env.WRITEUP_FILE || path.join(process.cwd(), "data", "WRITEUP.md");
  return fs.readFileSync(file, "utf8");
}
