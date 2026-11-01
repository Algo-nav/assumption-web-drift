// The one place the build-time inputs are pinned. Change a revision here, rebuild, and review the diff
// of data/ before deploying. Never point these at a branch name such as "main".
//
// Both values are full 40-character commit SHAs as of 2026-10-29.
export const DATASET_REVISION = "6534b8906294dab5b0a71302f0f75fdcf01b0528"; // huggingface.co/datasets/Nav772/assumption-drift
export const WRITEUP_REVISION = "a921ec640e0e0b9f406f4b7c54579a3546869b85"; // github.com/Algo-nav/assumption-drift

const SHA_RE = /^[0-9a-f]{40}$/;
for (const [name, value] of [["DATASET_REVISION", DATASET_REVISION], ["WRITEUP_REVISION", WRITEUP_REVISION]]) {
  if (!SHA_RE.test(value)) throw new Error(`${name} must be a 40-character commit SHA, got ${JSON.stringify(value)}`);
}

export const DATASET_URL = `https://huggingface.co/datasets/Nav772/assumption-drift/resolve/${DATASET_REVISION}/data/assumption_drift.jsonl`;
export const WRITEUP_URL = `https://raw.githubusercontent.com/Algo-nav/assumption-drift/${WRITEUP_REVISION}/WRITEUP.md`;

// Upper bounds on what a download may be, so a swapped or runaway response cannot exhaust build memory.
export const DATASET_MAX_BYTES = 20 * 1024 * 1024;
export const WRITEUP_MAX_BYTES = 1024 * 1024;
