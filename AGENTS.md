# AGENTS.md — THINGMAKER

Single source of truth for AI coding agents and human contributors working on `0thernes/thingmaker`.

## Purpose
Single-file, zero-dependency, offline-first procedural artifact/creature/lore generator (`index.html`) deployed to GitHub Pages (`https://0thernes.github.io/thingmaker/`).

## Hard Rules (Build Standard v1.2.0, R1–R8)
- **R1–R2:** Commit and push directly to `main`. No PRs, no feature branches, no GPG signing, no git hooks.
- **R3:** CI is informational only, never a merge gate.
- **R4:** Never add Dependabot, Renovate, CodeRabbit, PR templates, `.github/copilot-instructions.md`, or `FUNDING.yml`.
- **R6:** Never fabricate test counts, metrics, or capabilities. Run checks and report observed output.
- **Author / Legal Hygiene:** Alexander Stephen Donahue (`0_0@0thernes.art`, ORCID `0009-0006-8168-9648`, Independent Researcher, Spokane, WA, USA). Never assert `"0thernes LLC"`.

## Canonical Commands
```bash
node tools/lint-html.mjs      # HTML balance, unique IDs, ARIA refs, offline-only check, JS compile
node tools/selftest.mjs       # 18-category deterministic generator verification (720 draws)
node tools/size-budget.mjs    # index.html <= 160 KB, samples/ <= 25 MB, no file > 10 MB
```

## Key Invariants
1. `index.html` must stay a self-contained single file with zero network fetches (`lint-html.mjs` enforces offline-ness).
2. `VERSION`, `<meta name="thingmaker-version" content="...">` in `index.html`, `CITATION.cff`, and `CHANGELOG.md` must stay synchronized.
3. All generator randomness from a given `(seed, kind)` pair must remain deterministic (`xmur3` + `mulberry32`).
