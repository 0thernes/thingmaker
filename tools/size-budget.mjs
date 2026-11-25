#!/usr/bin/env node
/**
 * THINGMAKER size budget
 * ----------------------
 * Keeps the single-file app (and the repo) honest:
 *
 *   index.html            <= 160 KB   (override with --budget-kb=N)
 *   samples/ (all files)  <=  25 MB
 *   any single file       <=  10 MB
 *
 * 1 KB = 1024 bytes, 1 MB = 1024 KB.
 * Zero dependencies, Node 20+.  Run:  node tools/size-budget.mjs
 * Exits 0 when every budget is met, 1 otherwise.
 */
import { readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, sep } from "node:path";

const KB = 1024;
const MB = 1024 * 1024;

const PAGE_BUDGET_KB = 160;
const SAMPLES_BUDGET_MB = 25;
const SINGLE_FILE_BUDGET_MB = 10;

// Version-control and dependency directories are not shipped, so they are
// not counted against the "single file" budget.
const SKIP_DIRS = new Set([".git", "node_modules"]);

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

const argv = process.argv.slice(2);
let pageBudgetKb = PAGE_BUDGET_KB;

for (const arg of argv) {
  const match = /^--budget-kb=(\d+)$/.exec(arg);
  if (match) {
    pageBudgetKb = Number(match[1]);
    continue;
  }
  if (arg === "--help" || arg === "-h") {
    console.log("usage: node tools/size-budget.mjs [--budget-kb=N]");
    console.log("  --budget-kb=N  budget for index.html in KB (default " + PAGE_BUDGET_KB + ")");
    process.exit(0);
  }
  console.error("size-budget: unknown argument " + arg);
  console.error("usage: node tools/size-budget.mjs [--budget-kb=N]");
  process.exit(1);
}

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else {
      let stats;
      try {
        stats = statSync(full);
      } catch (err) {
        continue;
      }
      if (stats.isFile()) out.push({ path: full, size: stats.size });
    }
  }
  return out;
}

function fmt(bytes) {
  if (bytes >= MB) return (bytes / MB).toFixed(2) + " MB";
  if (bytes >= KB) return (bytes / KB).toFixed(1) + " KB";
  return bytes + " B";
}

function rel(path) {
  return relative(repoRoot, path) || path;
}

/* ── measure ─────────────────────────────────────────────────────────── */

const pagePath = join(repoRoot, "index.html");
const pageSize = existsSync(pagePath) ? statSync(pagePath).size : 0;

const allFiles = walk(repoRoot, []);
const samplesRoot = join(repoRoot, "samples");
const sampleFiles = allFiles.filter(function (file) {
  return relative(repoRoot, file.path).split(sep)[0] === "samples";
});
const samplesTotal = sampleFiles.reduce(function (sum, file) {
  return sum + file.size;
}, 0);

let largest = null;
for (const file of allFiles) {
  if (!largest || file.size > largest.size) largest = file;
}

/* ── report ──────────────────────────────────────────────────────────── */

const pageBudget = pageBudgetKb * KB;
const samplesBudget = SAMPLES_BUDGET_MB * MB;
const singleFileBudget = SINGLE_FILE_BUDGET_MB * MB;

const failures = [];

function verdict(ok) {
  return ok ? "PASS" : "FAIL";
}

const pageOk = pageSize <= pageBudget;
const samplesOk = samplesTotal <= samplesBudget;
const singleOk = largest === null || largest.size <= singleFileBudget;

if (!pageOk) {
  failures.push("index.html is " + fmt(pageSize) + ", over the " + pageBudgetKb + " KB budget by " + fmt(pageSize - pageBudget));
}
if (!samplesOk) {
  failures.push("samples/ is " + fmt(samplesTotal) + ", over the " + SAMPLES_BUDGET_MB + " MB budget by " + fmt(samplesTotal - samplesBudget));
}
if (!singleOk) {
  failures.push(rel(largest.path) + " is " + fmt(largest.size) + ", over the " + SINGLE_FILE_BUDGET_MB + " MB single-file budget by " + fmt(largest.size - singleFileBudget));
}

console.log("THINGMAKER size budget");
console.log("  repo        : " + (repoRoot.length > 46 ? "..." + repoRoot.slice(repoRoot.length - 43) : repoRoot));
console.log("  page budget : " + pageBudgetKb + " KB");
console.log("");

console.log("  " + pad("index.html", 24) + pad(fmt(pageSize), 12) + "of " + pad(pageBudgetKb + " KB", 10) + verdict(pageOk));
console.log("  " + pad("samples/ (" + sampleFiles.length + " files)", 24) + pad(fmt(samplesTotal), 12) + "of " + pad(SAMPLES_BUDGET_MB + " MB", 10) + verdict(samplesOk));
console.log("  " + pad("largest single file", 24) + pad(largest ? fmt(largest.size) : "-", 12) + "of " + pad(SINGLE_FILE_BUDGET_MB + " MB", 10) + verdict(singleOk));
if (largest) {
  console.log("  " + pad("", 24) + pad("", 12) + "  " + rel(largest.path));
}
console.log("");

if (failures.length === 0) {
  console.log("PASS - all budgets met.");
  process.exit(0);
}

console.log("FAIL - " + failures.length + " budget" + (failures.length === 1 ? "" : "s") + " exceeded");
for (const failure of failures) {
  console.log("  " + failure);
}
process.exit(1);

function pad(value, width) {
  const text = String(value);
  return text.length >= width ? text + "  " : text + " ".repeat(width - text.length);
}
