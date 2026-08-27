# src/canon — the rules corpus, verbatim

**Source:** `codex-canon.zip`, built 2026-08-26, handed over by Marcus.
**Landed:** 2026-08-26, Table Truth slice 1 (`docs/plans/table-truth/`).
**Contents:** the canon package's `data/` directory, all 13 files, **byte-for-byte**.

## The rule that matters

These files are **copies, not sources**. Do not hand-edit them — not to fix a typo, not to
add a spell, not to reformat. Verbatim is the whole point: it is what makes the package's
own precedence rule auditable, because a copy you have edited can no longer be diffed
against the original.

To change anything here, change it in the canon package and **replace the whole file**.

## Precedence, quoted from the package's own README

> 1. The DM's ruling at the table.
> 2. `data/*.json` — machine-readable rules and content. Where a `.md` file and a `.json`
>    file disagree, **the JSON wins**.
> 3. The markdown files in this directory.
> 4. Anything else — including the app's existing data, D&D Beyond tooltips, RPGBot, wikis,
>    and prior AI output.

## Two fields that must never be read

`spells.json` carries `castableAtLevel7` and `lockedForMarcus`. Those are canon's answers
**for a level-7 character** — they are snapshots of a rule, not the rule. Read
`unlocksAtPaladinLevel` and compare it to the character's actual level instead.
`src/lib/canon/lookup.test.ts` asserts that neither identifier appears anywhere in `src/`
outside the type definition, so this cannot rot.

## How it is loaded

`index.ts` is the only module in the app that `import`s a `.json` path. Everything else goes
through `src/lib/canon/`. The files are eagerly imported and bundled into their own
content-hashed chunk — deliberately not lazy-loaded, because the service worker precaches
all of `dist/assets/*` either way, so a lazy split would save zero bytes over the wire.
