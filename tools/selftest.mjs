/**
 * THINGMAKER self-test
 * --------------------
 * Loads the generator straight out of index.html into a sandboxed VM with a
 * minimal DOM stub, then hammers every category and asserts the output is
 * well-formed. Run with:  node tools/selftest.mjs
 *
 * This is the same code path the browser runs; only the DOM is faked.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "..", "index.html"), "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (!match) { console.error("no <script> block found in index.html"); process.exit(1); }
const source = match[1];

/* ── minimal DOM stub ─────────────────────────────────────────────── */
const styleStub = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}) });
function makeEl() {
  const target = {
    style: styleStub(),
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    children: [],
    value: "",
    innerHTML: "",
    textContent: "",
    offsetWidth: 0,
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { return c; },
    insertBefore(c) { return c; },
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    getAttribute: () => null,
    remove() {},
    click() {},
    focus() {},
    blur() {},
    querySelector: () => makeEl(),
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }),
    contains: () => false,
    closest: () => null,
    scrollIntoView() {},
    cloneNode() { return makeEl(); },
  };
  return new Proxy(target, { get: (t, k) => (k in t ? t[k] : () => {}) });
}
const el = makeEl();
const documentStub = {
  getElementById: () => el,
  createElement: () => makeEl(),
  body: { appendChild() {}, removeChild() {} },
  execCommand: () => true,
  addEventListener() {},
};
class AudioContextStub {
  createOscillator() {
    return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
  }
  get destination() { return {}; }
}
const store = new Map();
const sandbox = {
  console,
  document: documentStub,
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  },
  navigator: {},
  location: { hash: "" },
  history: { replaceState() {} },
  URLSearchParams,
  URL: { createObjectURL: () => "blob:stub", revokeObjectURL() {} },
  Blob,
  XMLSerializer: class { serializeToString() { return "<svg/>"; } },
  Image: class { set src(_) {} },
  AudioContext: AudioContextStub,
  webkitAudioContext: AudioContextStub,
  Math,
  Date,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  RegExp,
  Set,
  Map,
  Promise,
  Error,
  isNaN,
  parseInt,
  parseFloat,
  setTimeout,
  clearTimeout,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.window.isSecureContext = false;

const ctx = vm.createContext(sandbox);
vm.runInContext(source, ctx, { filename: "thingmaker.inline.js" });

/* ── assertions ───────────────────────────────────────────────────── */
const report = vm.runInContext(`(() => {
  const failures = [];
  const names = new Set();
  let arts = 0, lores = 0, attrs = 0;

  for (const cat of CAT_KEYS) {
    for (let i = 0; i < 40; i++) {
      const seed = "selftest-" + cat + "-" + i;
      const t = buildThing(seed, cat);
      const errs = [];
      if (!t.name || t.name.length < 2) errs.push("empty name");
      if (t.name.length > 26) errs.push("name too long (" + t.name.length + "): " + t.name);
      if (t.epithet && t.epithet.length < 3) errs.push("malformed epithet: " + t.epithet);
      if (!t.lore || t.lore.length < 3) errs.push("too few lore lines");
      if (!t.art || t.art.length < 400) errs.push("art too thin");
      if (!/<svg|</.test(t.art)) errs.push("art is not markup");
      if (Object.keys(t.attrs).length < 6) errs.push("too few attributes");
      const loreText = t.lore.join(" ");
      if (/\\{[a-z_]+\\}/.test(loreText)) errs.push("unfilled lore slot");
      if (/(^|\\s)a (aeiou)/.test(loreText)) errs.push("a/an error");
      if (/\\s\\bthe the\\b/.test(loreText)) errs.push("doubled word");
      if (errs.length) failures.push({ seed, cat, errs });
      names.add(t.name);
      arts += t.art.length;
      lores += t.lore.length;
      attrs += Object.keys(t.attrs).length;
    }
  }

  // same seed + same kind must reproduce the same thing, exactly
  const a = buildThing("repeatable-seed", "beast");
  const b = buildThing("repeatable-seed", "beast");
  const deterministic =
    a.name === b.name && a.epithet === b.epithet && a.art === b.art &&
    JSON.stringify(a.attrs) === JSON.stringify(b.attrs) &&
    JSON.stringify(a.lore) === JSON.stringify(b.lore);

  // different seeds must not collapse onto the same thing
  const unique = new Set();
  for (let i = 0; i < 400; i++) unique.add(JSON.stringify(buildThing("uniq-" + i, "beast").attrs));

  // every category must actually be reachable
  const categories = CAT_KEYS.length;
  const artKinds = new Set(CAT_KEYS.map(k => CATS[k].art));

  return {
    failures,
    deterministic,
    distinctNames: names.size,
    distinctAttributeSets: unique.size,
    categories,
    artKinds: artKinds.size,
    avgArtLength: Math.round(arts / (categories * 40)),
    avgLoreLines: +(lores / (categories * 40)).toFixed(2),
    avgAttributes: +(attrs / (categories * 40)).toFixed(2),
  };
})()`, ctx);

console.log("categories      :", report.categories, "over", report.artKinds, "art engines");
console.log("deterministic   :", report.deterministic);
console.log("distinct names  :", report.distinctNames, "over 720 draws");
console.log("distinct attrs  :", report.distinctAttributeSets, "over 400 draws");
console.log("avg art length  :", report.avgArtLength, "chars");
console.log("avg lore lines  :", report.avgLoreLines);
console.log("avg attributes  :", report.avgAttributes);

if (report.failures.length) {
  console.error("\nFAILURES:", report.failures.length);
  for (const f of report.failures.slice(0, 20)) console.error(" ", f.seed, f.cat, f.errs.join("; "));
  process.exit(1);
}
console.log("\nAll checks passed.");
