#!/usr/bin/env node
/**
 * THINGMAKER html lint
 * --------------------
 * Static checks for the single-file app in index.html:
 *
 *   1. the document parses as balanced, properly nested HTML
 *   2. exactly one <title>, one <html lang="...">, one <h1>
 *      (headings inside <noscript> are fallback copy for the no-script
 *       state and do not count towards the rendered document's one <h1>)
 *   3. every id attribute is unique
 *   4. aria-labelledby / aria-describedby / for point at ids that exist
 *   5. nothing is loaded from another origin (the app must stay offline)
 *   6. every inline <script> block is syntactically valid JavaScript
 *
 * Zero dependencies, Node 20+.  Run:  node tools/lint-html.mjs
 * Exits 0 when clean, 1 with the list of findings otherwise.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, isAbsolute } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

const positional = process.argv.slice(2).filter(function (arg) {
  return arg.charAt(0) !== "-";
});
const target = positional.length === 0
  ? join(repoRoot, "index.html")
  : (isAbsolute(positional[0]) ? positional[0] : join(process.cwd(), positional[0]));

let html;
try {
  html = readFileSync(target, "utf8");
} catch (err) {
  console.error("lint-html: cannot read " + target + ": " + err.message);
  process.exit(1);
}
const relTarget = relative(repoRoot, target) || target;

/* ── html constants ──────────────────────────────────────────────────── */

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

// Raw text elements: their content is text, never markup.
const RAW_TEXT_ELEMENTS = new Set(["script", "style", "textarea", "title"]);

// Foreign content: the subtree is not part of the html tag tree.
const FOREIGN_ELEMENTS = new Set(["svg", "math"]);

// Elements whose end tag may legally be omitted by the html spec.
const BLOCK_LEVEL = new Set([
  "address", "article", "aside", "blockquote", "details", "div", "dl",
  "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3",
  "h4", "h5", "h6", "header", "hgroup", "hr", "main", "menu", "nav", "ol",
  "p", "pre", "section", "table", "ul",
]);

const IMPLIED_END = {
  li: ["li"],
  dt: ["dt", "dd"],
  dd: ["dt", "dd"],
  option: ["option", "optgroup"],
  optgroup: ["optgroup"],
  thead: ["tbody", "tfoot"],
  tbody: ["tbody", "tfoot"],
  tfoot: ["tbody"],
  tr: ["tr", "tbody", "tfoot", "thead"],
  td: ["td", "th", "tr", "tbody", "tfoot", "thead"],
  th: ["td", "th", "tr", "tbody", "tfoot", "thead"],
  p: Array.from(BLOCK_LEVEL),
};

// Attributes that make the browser fetch a resource.
const RESOURCE_ATTRS = ["src", "srcset", "poster", "data", "action", "formaction", "manifest", "ping"];

// Attributes that must point at an existing id.
const REFERENCE_ATTRS = ["aria-labelledby", "aria-describedby", "for"];

/* ── findings ────────────────────────────────────────────────────────── */

const findings = [];

function report(code, message, line) {
  findings.push({ code: code, message: message, line: line || 0 });
}

/* ── line index ──────────────────────────────────────────────────────── */

const lineStarts = [0];
for (let i = 0; i < html.length; i++) {
  if (html.charCodeAt(i) === 10) lineStarts.push(i + 1);
}
const totalLines = lineStarts.length;

function lineOf(index) {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid] <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/* ── scanning helpers ────────────────────────────────────────────────── */

const RE_TAG_NAME = /[a-zA-Z][a-zA-Z0-9:._-]*/y;
const RE_ATTR_NAME = /[^\s"'>/=]+/y;
const RE_UNQUOTED = /[^\s>]*/y;
const RE_SPACE = /\s*/y;
const RE_ISLAND_ID = /(?<![-\w])id\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>]+))/gi;

function parseStartTag(start) {
  RE_TAG_NAME.lastIndex = start + 1;
  const nameMatch = RE_TAG_NAME.exec(html);
  if (!nameMatch) return null;
  const name = nameMatch[0].toLowerCase();
  let p = RE_TAG_NAME.lastIndex;
  const attrs = [];
  let selfClosing = false;

  while (p < html.length) {
    RE_SPACE.lastIndex = p;
    p += RE_SPACE.exec(html)[0].length;
    if (p >= html.length) break;
    if (html.charAt(p) === ">") {
      p += 1;
      break;
    }
    if (html.charAt(p) === "/" && html.charAt(p + 1) === ">") {
      selfClosing = true;
      p += 2;
      break;
    }
    RE_ATTR_NAME.lastIndex = p;
    const attrMatch = RE_ATTR_NAME.exec(html);
    if (!attrMatch) {
      p += 1;
      continue;
    }
    const attrName = attrMatch[0].toLowerCase();
    p = RE_ATTR_NAME.lastIndex;
    RE_SPACE.lastIndex = p;
    p += RE_SPACE.exec(html)[0].length;

    let value = null;
    if (html.charAt(p) === "=") {
      p += 1;
      RE_SPACE.lastIndex = p;
      p += RE_SPACE.exec(html)[0].length;
      const quote = html.charAt(p);
      if (quote === '"' || quote === "'") {
        const close = html.indexOf(quote, p + 1);
        if (close < 0) {
          value = html.slice(p + 1);
          p = html.length;
        } else {
          value = html.slice(p + 1, close);
          p = close + 1;
        }
      } else {
        RE_UNQUOTED.lastIndex = p;
        const raw = RE_UNQUOTED.exec(html)[0];
        value = raw;
        p += raw.length;
        if (value.charAt(value.length - 1) === "/" && html.charAt(p) === ">") {
          value = value.slice(0, -1);
          selfClosing = true;
        }
      }
    }
    attrs.push({ name: attrName, value: value });
  }
  return { name: name, attrs: attrs, selfClosing: selfClosing, end: p };
}

// Raw text elements run until their matching close tag; content is skipped.
function findRawTextEnd(from, tag) {
  const re = new RegExp("</" + tag + "\\s*>", "i");
  const m = re.exec(html.slice(from));
  return m ? { contentEnd: from + m.index, end: from + m.index + m[0].length } : null;
}

// Foreign content islands run until the matching close tag, nested islands counted.
function findIslandEnd(from, tag) {
  const openRe = new RegExp("<" + tag + "(?=[\\s/>])", "gi");
  const closeRe = new RegExp("</" + tag + "\\s*>", "gi");
  let depth = 1;
  let pos = from;
  while (pos < html.length) {
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;
    const open = openRe.exec(html);
    const close = closeRe.exec(html);
    if (!close) return -1;
    if (open && open.index < close.index) {
      depth += 1;
      pos = open.index + open[0].length;
      continue;
    }
    depth -= 1;
    pos = close.index + close[0].length;
    if (depth === 0) return pos;
  }
  return -1;
}

function attrValue(el, name) {
  for (const attr of el.attrs) {
    if (attr.name === name) return attr.value;
  }
  return null;
}

function refKind(url) {
  const u = String(url === null || url === undefined ? "" : url).trim();
  if (!u) return "empty";
  if (u.slice(0, 2) === "//") return "external";
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(u);
  if (scheme) {
    const name = scheme[1].toLowerCase();
    if (name === "data" || name === "blob") return "inline";
    return "external";
  }
  if (u.charAt(0) === "#") return "fragment";
  return "local";
}

/* ── parse ───────────────────────────────────────────────────────────── */

const stack = [];
const elements = [];
const scripts = [];
const idRecords = [];
let doctypeCount = 0;

function addId(value, line, tag) {
  const trimmed = String(value).trim();
  if (trimmed) idRecords.push({ value: trimmed, line: line, tag: tag });
}

function closeElement(name, line) {
  if (VOID_ELEMENTS.has(name)) {
    report("void-close", "</" + name + "> closes a void element", line);
    return;
  }
  let idx = -1;
  for (let k = stack.length - 1; k >= 0; k--) {
    if (stack[k].name === name) {
      idx = k;
      break;
    }
  }
  if (idx < 0) {
    report("stray-close", "</" + name + "> has no matching opening tag", line);
    return;
  }
  for (let k = stack.length - 1; k > idx; k--) {
    report("unclosed-tag", "<" + stack[k].name + "> is never closed", stack[k].line);
  }
  stack.length = idx;
}

let i = 0;
while (i < html.length) {
  const lt = html.indexOf("<", i);
  if (lt < 0) break;

  if (html.startsWith("<!--", lt)) {
    const end = html.indexOf("-->", lt + 4);
    i = end < 0 ? html.length : end + 3;
    continue;
  }
  if (html.startsWith("<!", lt)) {
    const end = html.indexOf(">", lt);
    const declaration = html.slice(lt, end < 0 ? html.length : end);
    if (/^<!doctype/i.test(declaration)) doctypeCount += 1;
    i = end < 0 ? html.length : end + 1;
    continue;
  }
  if (html.startsWith("<?", lt)) {
    const end = html.indexOf(">", lt);
    i = end < 0 ? html.length : end + 1;
    continue;
  }
  if (html.startsWith("</", lt)) {
    const end = html.indexOf(">", lt);
    if (end < 0) {
      report("malformed-tag", "unterminated closing tag", lineOf(lt));
      break;
    }
    const name = html.slice(lt + 2, end).trim().toLowerCase();
    i = end + 1;
    closeElement(name, lineOf(lt));
    continue;
  }

  const tag = parseStartTag(lt);
  if (!tag) {
    i = lt + 1;
    continue;
  }
  i = tag.end;
  const line = lineOf(lt);
  const el = {
    name: tag.name,
    attrs: tag.attrs,
    line: line,
    inNoscript: stack.some(function (open) { return open.name === "noscript"; }),
  };
  elements.push(el);

  const idAttr = attrValue(el, "id");
  if (idAttr !== null) addId(idAttr, line, tag.name);

  if (RAW_TEXT_ELEMENTS.has(tag.name)) {
    const span = findRawTextEnd(i, tag.name);
    if (!span) {
      if (tag.name === "script") scripts.push({ source: html.slice(i), line: line });
      report("unclosed-tag", "<" + tag.name + "> is never closed", line);
      i = html.length;
      continue;
    }
    if (tag.name === "script") scripts.push({ source: html.slice(i, span.contentEnd), line: line });
    i = span.end;
    continue;
  }

  if (FOREIGN_ELEMENTS.has(tag.name)) {
    const end = findIslandEnd(i, tag.name);
    if (end < 0) {
      report("unclosed-tag", "<" + tag.name + "> is never closed", line);
      i = html.length;
      continue;
    }
    const chunk = html.slice(i, end);
    RE_ISLAND_ID.lastIndex = 0;
    let m;
    while ((m = RE_ISLAND_ID.exec(chunk)) !== null) {
      const value = m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : (m[4] || ""));
      addId(value, lineOf(i + m.index), tag.name);
    }
    i = end;
    continue;
  }

  if (VOID_ELEMENTS.has(tag.name) || tag.selfClosing) continue;

  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    const implied = IMPLIED_END[top.name];
    if (implied && implied.indexOf(tag.name) !== -1) {
      stack.pop();
      continue;
    }
    break;
  }
  stack.push({ name: tag.name, line: line });
}

for (const open of stack) {
  report("unclosed-tag", "<" + open.name + "> is never closed", open.line);
}

/* ── checks ──────────────────────────────────────────────────────────── */

const unbalanced = findings.filter(function (f) {
  return f.code === "unclosed-tag" || f.code === "stray-close" || f.code === "void-close" || f.code === "malformed-tag";
}).length;

const titles = elements.filter(function (el) { return el.name === "title"; });
const htmlElements = elements.filter(function (el) { return el.name === "html"; });
const h1s = elements.filter(function (el) { return el.name === "h1" && !el.inNoscript; });
const noscriptHeadings = elements.filter(function (el) { return el.name === "h1" && el.inNoscript; });
const htmlLang = htmlElements.length === 1 ? (attrValue(htmlElements[0], "lang") || "").trim() : "";

if (titles.length !== 1) {
  report("title-count", "expected exactly one <title>, found " + titles.length, titles.length ? titles[0].line : 0);
}
if (htmlElements.length !== 1) {
  report("html-count", "expected exactly one <html>, found " + htmlElements.length, htmlElements.length ? htmlElements[0].line : 0);
} else if (!htmlLang) {
  report("html-lang", "<html> is missing a lang attribute", htmlElements[0].line);
}
if (h1s.length !== 1) {
  report("h1-count", "expected exactly one <h1>, found " + h1s.length, h1s.length ? h1s[0].line : 0);
}

const idMap = new Map();
let duplicateIds = 0;
for (const rec of idRecords) {
  if (idMap.has(rec.value)) {
    duplicateIds += 1;
    report("duplicate-id", "id \"" + rec.value + "\" is used more than once (first at line " + idMap.get(rec.value).line + ")", rec.line);
  } else {
    idMap.set(rec.value, rec);
  }
}

let referenceCount = 0;
let missingReferences = 0;
for (const el of elements) {
  for (const attrName of REFERENCE_ATTRS) {
    const value = attrValue(el, attrName);
    if (value === null) continue;
    const tokens = value.split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      referenceCount += 1;
      if (!idMap.has(token)) {
        missingReferences += 1;
        report("missing-reference", attrName + "=\"" + token + "\" on <" + el.name + "> matches no id", el.line);
      }
    }
  }
}

let externalRefs = 0;
for (const el of elements) {
  if (el.name === "script") {
    const src = attrValue(el, "src");
    if (src !== null) {
      const kind = refKind(src);
      if (kind === "external") {
        externalRefs += 1;
        report("external-resource", "<script src=\"" + src + "\"> loads from another origin; the app must stay single-file and offline", el.line);
      } else if (kind === "local") {
        report("split-file", "<script src=\"" + src + "\"> breaks the single-file rule; inline the script instead", el.line);
      }
    }
  }
  if (el.name === "link") {
    const href = attrValue(el, "href");
    const rel = (attrValue(el, "rel") || "").toLowerCase();
    const kind = refKind(href);
    if (kind === "external") {
      externalRefs += 1;
      report("external-resource", "<link rel=\"" + rel + "\" href=\"" + href + "\"> loads from another origin; the app must stay single-file and offline", el.line);
    } else if (kind === "local" && rel.split(/\s+/).indexOf("stylesheet") !== -1) {
      report("split-file", "<link rel=\"stylesheet\" href=\"" + href + "\"> breaks the single-file rule; inline the stylesheet instead", el.line);
    }
  }
  for (const attrName of RESOURCE_ATTRS) {
    if (el.name === "script" && attrName === "src") continue;
    const value = attrValue(el, attrName);
    if (value === null) continue;
    const urls = attrName === "srcset"
      ? value.split(",").map(function (part) { return part.trim().split(/\s+/)[0]; })
      : [value];
    for (const url of urls) {
      if (refKind(url) === "external") {
        externalRefs += 1;
        report("external-resource", "<" + el.name + " " + attrName + "=\"" + url + "\"> loads from another origin; the app must stay single-file and offline", el.line);
      }
    }
  }
}

let scriptErrors = 0;
for (const script of scripts) {
  try {
    new vm.Script(script.source, { filename: relTarget + ":" + script.line });
  } catch (err) {
    scriptErrors += 1;
    report("js-syntax", "inline <script> is not valid JavaScript: " + err.message, script.line);
  }
}
if (scripts.length === 0) {
  report("no-script", "no inline <script> block found in " + relTarget, 0);
}

/* ── report ──────────────────────────────────────────────────────────── */

const checks = [
  { ok: unbalanced === 0, label: "balanced markup", detail: elements.length + " elements, " + unbalanced + " unbalanced" },
  { ok: titles.length === 1, label: "<title>", detail: titles.length + " found" },
  { ok: htmlElements.length === 1 && htmlLang !== "", label: "<html lang>", detail: htmlElements.length + " found, lang=\"" + htmlLang + "\"" },
  { ok: h1s.length === 1, label: "<h1>", detail: h1s.length + " found" + (noscriptHeadings.length ? " (+" + noscriptHeadings.length + " in <noscript>)" : "") },
  { ok: duplicateIds === 0, label: "unique ids", detail: idRecords.length + " ids, " + duplicateIds + " duplicated" },
  { ok: missingReferences === 0, label: "id references", detail: referenceCount + " references, " + missingReferences + " unresolved" },
  { ok: externalRefs === 0, label: "offline / single-file", detail: externalRefs + " external references" },
  { ok: scriptErrors === 0 && scripts.length > 0, label: "inline script syntax", detail: scripts.length + " blocks, " + scriptErrors + " broken" },
];

const kb = (Buffer.byteLength(html, "utf8") / 1024).toFixed(1);
console.log("THINGMAKER html lint");
console.log("  target : " + relTarget);
console.log("  size   : " + kb + " KB, " + totalLines + " lines");
console.log("  doctype: " + (doctypeCount === 1 ? "present" : doctypeCount + " found"));
console.log("");
for (const check of checks) {
  console.log("  [" + (check.ok ? "ok  " : "FAIL") + "] " + check.label.padEnd(24) + check.detail);
}

if (findings.length === 0) {
  console.log("");
  console.log("PASS - no findings.");
  process.exit(0);
}

console.log("");
console.log("FAIL - " + findings.length + " finding" + (findings.length === 1 ? "" : "s"));
findings.sort(function (a, b) { return a.line - b.line; });
for (const finding of findings) {
  console.log("  line " + finding.line + "  " + finding.code + ": " + finding.message);
}
process.exit(1);
