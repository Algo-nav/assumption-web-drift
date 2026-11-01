// Downloads the published dataset and the write-up into data/ at build time.
// Both are pinned to a commit SHA in scripts/data-sources.mjs, never to a branch.
// The jsonl lives at data/assumption_drift.jsonl on the dataset repo (there is no data/release/ folder there).
// The write-up lives in the GitHub code repo, not the dataset repo.
import fs from "node:fs/promises";
import path from "node:path";
import { DATASET_URL, WRITEUP_URL, DATASET_MAX_BYTES, WRITEUP_MAX_BYTES } from "./data-sources.mjs";

const FILES = [
  {
    url: DATASET_URL,
    dest: "data/release.jsonl",
    maxBytes: DATASET_MAX_BYTES,
    check: (text) => text.trim().split("\n").every((l) => JSON.parse(l).record_id),
  },
  {
    url: WRITEUP_URL,
    dest: "data/WRITEUP.md",
    maxBytes: WRITEUP_MAX_BYTES,
    check: (text) => text.includes("What the model got wrong"),
  },
];

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// Reads the body but stops as soon as it passes maxBytes, so the cap holds for chunked responses too.
async function readCapped(res, maxBytes) {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error(`response is ${declared} bytes, over the ${maxBytes} limit`);
  const chunks = [];
  let total = 0;
  for await (const chunk of res.body) {
    total += chunk.length;
    if (total > maxBytes) throw new Error(`response is over the ${maxBytes} byte limit`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

let failed = false;
for (const { url, dest, check, maxBytes } of FILES) {
  const out = path.join(process.cwd(), dest);
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await readCapped(res, maxBytes);
    if (!check(text)) throw new Error("downloaded file failed its sanity check");
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, text);
    console.log(`fetched ${dest} (${text.length} bytes)`);
  } catch (err) {
    if (await exists(out)) {
      console.warn(`could not fetch ${url} (${err.message}); keeping existing ${dest}`);
    } else {
      console.error(`could not fetch ${url} (${err.message}) and ${dest} does not exist`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
