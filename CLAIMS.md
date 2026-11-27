# Claims Ledger (`CLAIMS.md`)

Every technical claim made by `0thernes/thingmaker` (`v2.1.0`), mapped strictly to its verification method and explicit refutation criterion (Build Standard `B04`, `B05`, `B42`).

| ID | Claim | Verification Command | What Would Prove Us Wrong (Falsification) |
|---|---|---|---|
| C1 | `index.html` is valid, balanced HTML with unique IDs, valid ARIA references, compiling inline JS, and zero external network resources. | `node tools/lint-html.mjs` | Any unbalanced tag, duplicate `id`, broken `aria-*`/`for` reference, syntax error, or external URL resource attribute causing exit code != 0. |
| C2 | The generator covers 18 categories across 9 procedural SVG art engines and is strictly deterministic for a given `(seed, kind)` pair. | `node tools/selftest.mjs` | Any duplicate `(seed, kind)` producing different attributes, names, lore, or SVG output, or any category failing template/grammar invariants. |
| C3 | The complete application stays within its single-file size budget (`index.html <= 160 KB`, `samples/ <= 25 MB`, no file `> 10 MB`). | `node tools/size-budget.mjs` | Any file exceeding the declared budget causing `size-budget.mjs` to exit non-zero. |
| C4 | The live GitHub Pages deployment serves `index.html` with matching byte length and build markers. | `.github/workflows/smoke.yml` | HTTP status != 200, missing static build marker, or byte-length mismatch between deployed HTML and committed `index.html`. |

## Explicit Non-Claims
- THINGMAKER is a creative procedural web application, **not** an academic theorem prover, physical simulator, or AI/ML model (`0/1,900` open problems in `unsolved-problems-mega-atlas`).
