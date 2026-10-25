# THINGMAKER

**A machine for making things that have never existed.**

Open `index.html` in any browser. That's the whole install — one HTML file,
no build step, no dependencies, no network calls. It works offline from a USB
stick.

Press **space**. A creature, artifact, food, weather, planet, religion, law,
sport, business or sound appears, with a portrait, a name, a set of
improbable attributes, and a short piece of lore that takes it entirely
seriously.

---

## What it does

| | |
|---|---|
| **18 kinds of thing** | Creature, Artifact, Appliance, Vehicle, Food, Plant, Fungus, Spirit, Mineral, Planet, Weather, Sound, Emotion, Disease, Religion, Sport, Business, Law |
| **9 portrait engines** | Each category has its own procedural SVG illustrator — blob beasts, machines, plated food, flora, fuzzy spirits, crystal shards, planets, storm systems, geometric glyphs |
| **~70 attribute pools** | Size, colour, texture, habitat, diet, temperament, smell, flaw, maker, secret, and dozens more, each with a hand-written set of values |
| **Seeded** | The same seed and kind always produce the same thing, byte for byte. Seeds are human-readable (`vellum-pumice-594`) so you can write one down |
| **Shareable** | The URL updates with every thing. Copy the address bar and someone else opens exactly your thing |
| **Shareable artefacts** | Export a 1200×1680 PNG card, the raw SVG, or JSON, or copy the lore to the clipboard |

## Controls

| Action | How |
|---|---|
| Make a thing | **space**, or the **MAKE THING** button |
| Make a thing of one kind | Pick a kind from **KIND OF THING** |
| Re-roll a specific seed | Type in the **SEED** field, press **enter** |
| A fresh random seed | The **⚄** button |
| Rename the current thing | **Rename it** |
| Two things meet | **Encounter** — generates a second thing and a vignette of the two of them |
| Light / dark | **theme** (remembered) |
| Sound | **sound** (remembered; a small synthesised blip on each make) |

The last ten things stay in **RECENTLY MADE** and can be revisited by clicking
them. History is kept in `localStorage`, so it survives a reload.

## How the generation works

Four independent random streams are derived from `seed + "|" + kind`, so
changing one system never reshuffles the others:

1. **Attributes** — each attribute picks one value from its pool.
2. **Name** — a syllable grammar (`ONSET + NUCLEI + CODA` over nine patterns)
   assembled into a single word, a two-word name, a titled name, or a hyphenated
   one, with an optional epithet (*"the Very Loud"*, *"of the Glass Sea"*).
3. **Lore** — the category's templates are shuffled and filled from the
   attributes, with an a/an pass so *"a enormous"* becomes *"an enormous"*.
4. **Portrait** — the art engine draws into the SVG using its own stream, so a
   thing's portrait is stable across reloads and identical in every export.

Everything is deterministic: `xmur3` seeds a `mulberry32` PRNG, and there is no
`Math.random` anywhere in the generator path except for deliberately unseeded
things (a fresh seed, an encounter partner).

## Exports

- **Card PNG** — a 1200×1680 shareable card: portrait, category, name, epithet,
  the first two sentences of lore, and the seed so the thing can be rebuilt.
- **SVG** — the raw portrait markup. Some browsers put `.svg` downloads behind
  a "keep this file" prompt, so the SVG button *also* copies the markup to the
  clipboard — the source is never trapped.
- **JSON** — name, epithet, category, seed, every attribute, every lore line.
  Useful for feeding the generator's output somewhere else.
- **Copy lore** — plain text, name and lore only.

## Self-test

The generator is exercised without a browser:

```bash
node tools/selftest.mjs
```

It loads the inline `<script>` out of `index.html` into a VM with a stub
DOM and then draws 40 things for each of the 18 categories, asserting that
names are well-formed and bounded, that every lore slot is filled, that there
are no `the the` doubles or `a`/`an` slips, that the art is real markup, and
that the same seed reproduces the same thing exactly.

```
categories      : 18 over 9 art engines
deterministic   : true
distinct names  : 719 over 720 draws
distinct attrs  : 400 over 400 draws
All checks passed.
```

## Files

```
Thingmaker/
├── index.html          the entire machine (markup, styles, logic, art)
├── tools/selftest.mjs       headless generator test
└── samples/                 a few things it has already made
```

## Notes

- Nothing here was found on the internet. Every name, attribute and sentence is
  assembled from the generator's own word banks.
- The lore is fiction. The physics is not.
