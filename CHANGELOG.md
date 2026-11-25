# Changelog

All notable changes to THINGMAKER are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.1.0] — 2026-11-25

### Added
- **The lore core, second pass.** Lore is now assembled in narrative order
  (identity → situation → catalogue detail) from a rotating window instead of a
  shuffle, so the prose reads as a dossier rather than a bag of sentences.
  A line is skipped when it would repeat an attribute value already used, so
  the same trait stops showing up twice in one specimen.
- **Catalogue metadata.** Every specimen now carries a recorded date, shown in
  the dossier and printed on the exported card.
- **The shelf.** Pin up to six specimens and hold them side by side
  (`⇧`+`P`). Pinned items store only their seed and kind, so the shelf stays
  deterministic and costs nothing to keep.
- **Copy link** button and `L` shortcut.
- **History thumbnails** — the last ten specimens now show their portraits.
- **Nightly smoke test** (`.github/workflows/smoke.yml`) that fetches the
  deployed site, checks the build markers, and fails if the published page has
  drifted from `index.html`.
- MIT `LICENSE`, this changelog, and a version string in the footer.

### Changed
- **Rendering.** The key light and rim light now apply to every portrait
  engine, not just creatures; machines, food and motes draw from the same
  silhouette vocabulary, and machines come in console, tower and dome forms.
- **3D stage.** A specular highlight follows the pointer, and the badge and
  seed float at their own depth above the plate.
- **Typography.** Specimen names use tabular figures and scale down when long;
  attribute values use tabular numerals.
- **Contrast.** The dimmest text token in every skin was raised to meet
  WCAG AA for small text, and `prefers-contrast: more` is now honoured.
- **Accessibility.** The live region moved off the whole dossier (which
  announced everything) onto a dedicated status line.

### Fixed
- The HTML linter now ignores headings inside `<noscript>`.
- Dependabot pointed at the repository root for the `github-actions` ecosystem.

## [2.0.0] — 2026-11-25

### Added
- Design-token system with seven skins and a dark/light switch.
- 3D stage with perspective, a lit floor and pointer tilt.
- Wireframe mode (`W`) revealing the layout skeleton.
- SVG shaders: film grain, soft ground shadows, vignette.
- Eight silhouette families for creature bodies.
- Full keyboard map, help modal with focus trap, skip link, print styles.
- CI, Pages deployment, release and Dependabot workflows; branch protection
  on `main` requiring the CI check.

### Fixed
- Six unresolvable lore-template slots that left four categories without a
  field note.
- `history` shadowing `window.history`.
- Browser downloads stalling as `.tmp` files because the anchor was removed
  before Chromium finished reading the blob.
