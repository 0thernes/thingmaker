# Replication Protocol (`REPLICATION.md`)

## Clean-Clone Verification (Zero Dependencies)

Requires only **Node.js 20+**. No `npm install`, bundler, or network access is needed.

```bash
git clone https://github.com/0thernes/thingmaker.git
cd thingmaker
node tools/lint-html.mjs
node tools/selftest.mjs
node tools/size-budget.mjs
```

Expected result: all three commands exit `0` with `All checks passed.` from `tools/selftest.mjs`.

## Interactive Smoke Test
Open `index.html` directly in any modern browser (offline `file://` supported) and press `Space` to generate specimens, `S` to cycle skins, `W` to toggle wireframe mode, and `Shift+P` to pin to the shelf.

## Replication Log

| Date | Environment | Commit / Version | Result |
|---|---|---|---|
| 2026-11-27 | Windows 11, Node.js (local clean verification) | `v2.1.0` | Verified `lint-html.mjs`, `selftest.mjs`, and `size-budget.mjs` exit 0 |
