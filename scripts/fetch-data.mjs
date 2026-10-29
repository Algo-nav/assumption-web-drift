// Downloads the published dataset and the write-up into data/ at build time.
// The jsonl lives at data/assumption_drift.jsonl on the dataset repo (there is no data/release/ folder there).
// The write-up lives in the GitHub code repo, not the dataset repo.
import fs from "node:fs/promises";
import path from "node:path";

const FILES = [
  {
    url: "https://huggingface.co/datasets/Nav772/assumption-drift/resolve/main/data/assumption_drift.jsonl",
    dest: "data/release.jsonl",
    check: (text) => text.trim().split("\n").every((l) => JSON.parse(l).record_id),
  },
  {
    url: "https://raw.githubusercontent.com/Algo-nav/assumption-drift/main/WRITEUP.md",
    dest: "data/WRITEUP.md",
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

let failed = false;
for (const { url, dest, check } of FILES) {
  const out = path.join(process.cwd(), dest);
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
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
