# Decks

A **deck** is a named, installable collection of [flowdeck](https://github.com/ruco-dev/flowdeck) blueprints and energy cards for a specific domain. Each deck ships with a `<deck>-init` blueprint that scaffolds its working directory.

**Source vs. runtime:** the canonical source for every deck is `flowdeck/decks/<name>/` (this repo). When a deck is installed into a project, flowdeck copies its blueprints and energy cards into the project's `.flowdeck/` directory. That copy is a runtime artifact — gitignored and overwritten on reinstall. Never edit it directly; always edit the source here.

Install any deck into a project with a single command:

```bash
flowdeck install <deck-name> --local
```

## Available Decks

| Deck | Description | Blueprints |
|---|---|---|
| [`crunchdeck`](crunchdeck/) | Product management — PROFILE, BACKLOG, ROADMAP, ADR, and inbox under `.flowdeck/.crunchdeck/`. **Sleeve:** `crunchdeck-init` is a `sleeveCards` ritual (replay = install-repair) and `publish-readiness-audit` is a second sleeve ritual — a read-only pre-flight (registry identity, tarball truth, git hygiene, docs drift, deck state — incl. the card-sending inbox gate `flowdeck inbox --gate` — CI, build smoke) played before each release, minting a `prepare-to-publish` folder card (`AUDIT.md` + bot/human fix tasks) and handing off to `launches/` on a READY verdict; the 6 operational instruments (crunchdeck-inbox / profile / backlog / roadmap / stats / launches) are folder cards under `.crunchdeck/` (`lifecycle: recurring`), scaffolded by init | `crunchdeck-adr`, `crunchdeck-promote` (sleeveCards: `crunchdeck-init`, `publish-readiness-audit`) |
| [`emaildeck`](emaildeck/) | Gmail filter rules as flowdeck cards — fetch, label, and route findings to crunchdeck; filters run via a deterministic `_scripts/emaildeck_run.js` runner. **Underscore-reversal pioneer (0.9.0, ADR-0006):** the 4 operational instruments are plain-named folder cards under `.emaildeck/` (mail-inbox / filters / drafts / mail-archive, `lifecycle: recurring` + `recurrence:`); `_` is reserved for piles (`_digests`, `_scripts`, `_sleeve`); the runner resolves plain names with a `_`-prefixed fallback for not-yet-migrated instances. **Setup / inboxing split:** two `sleeveCards` rituals — `emaildeck-init` scaffolds structure (replay = install-repair) and `emaildeck-setup` establishes filters + first backfill (played on demand); recurring inboxing is the `mail-inbox/` folder card (`recurrence: daily`, cron-able via `flowdeck play mail-inbox` + a `schedule-inboxing` action). Ships `process-inbox` / `process-drafts` standing steps on the `mail-inbox/` and `drafts/` cards (bulk-execute activated cards inline; dormant menus stay quarantined; drafts sweep runs before the push program so content edits land first) and an on-demand `emaildeck-digest` newsletter-digest ritual (`skills: content-digest`) that distils unread newsletters into dated `_digests/` docs | `emaildeck-add-filter`, `emaildeck-compose`, `emaildeck-backfill-bodies`, `emaildeck-digest` (sleeveCards: `emaildeck-init`, `emaildeck-setup`) |
| [`gitdeck`](gitdeck/) | GitHub repo vigilance — watches owned, competitor, provider, consumer, and benchmark repos; routes findings to crunchdeck. **Sleeve:** `gitdeck-init` is a `sleeveCards` ritual; ships no folder-scoped instruments beyond init | `gitdeck-add-repo` (sleeveCards: `gitdeck-init`) |
| [`webdeck`](webdeck/) | Web search signals — runs configured queries and routes findings to crunchdeck. **Sleeve:** `webdeck-init` is a `sleeveCards` ritual; ships no folder-scoped instruments beyond init | `webdeck-add-query` (sleeveCards: `webdeck-init`) |
| [`notedeck`](notedeck/) | Freeform notes as flowdeck cards under `.flowdeck/.notedeck/`. **Sleeve:** `notedeck-init` is a `sleeveCards` ritual; packages no true-template blueprints | none (sleeveCards: `notedeck-init`) |
| [`creamdeck`](creamdeck/) | Project-scoped CRM — contacts, a unified email/call inbox, and a ticket pipeline with REPORT.md + static HTML report exports; tickets can spawn a calendardeck meeting via `add-meeting`. Also a proposal → request note → invoice billing chain — approving a proposal mints a per-item hash (`approve-proposal.js`) a ticket's `Billing Ref` can point to; invoices export a provider-agnostic `invoice-export.json` (`export-invoice.js`) for a future financial-app connector. **Sleeve:** `creamdeck-init` is a `sleeveCards` ritual (shares emaildeck's `manifest.scripts`/`_scripts/` interim convention) | `creamdeck-add-contact`, `creamdeck-open-ticket`, `creamdeck-new-proposal` (sleeveCards: `creamdeck-init`) |
| [`calendardeck`](calendardeck/) | Google Calendar events as flowdeck cards — one-way sync (GCal → local, with a token → MCP → ICS fallback chain) over browser-OAuth REST v3, with per-day, week, month, and year cards; day-scoped `sync-day` re-fetch with idempotent meeting-notes injection; a flat `_events/` quick-event convention for ad-hoc meetings; optional public ICS source and a `send-to-gcal` action for pushing tasks back. **Sleeve:** `calendardeck-init` is a `sleeveCards` ritual; the whole-tree sync is now a root-level folder card at `.calendardeck/TODO.md` (`lifecycle: recurring`), scaffolded by init | none (sleeveCards: `calendardeck-init`) |
| [`farmdeck`](farmdeck/) | Prospection pipeline — track contacts through Seed → Nurture → Active → Won / Dropped; programmatic intake via `flowdeck create-card` (CLI-001). **Sleeve:** `farmdeck-init` is a `sleeveCards` ritual; the 5 operational instruments (farmdeck-inbox / prospects / won / dropped / pipeline) are folder cards under `.farmdeck/` (`lifecycle: recurring`), scaffolded by init | `farmdeck-add-prospect` (sleeveCards: `farmdeck-init`) |

Decks still incubating live in a gitignored `LOCAL-DECKS.md` (same table format);
their `decks/<name>/` folders are gitignored too. A deck goes public by moving its
row here and untracking its `.gitignore` entry.

## Contributing a Deck

Add a `decks/<name>/` folder to this repo:

```
decks/<name>/
  manifest.json          ← deck registry (see format below)
  AGENT.md               ← full deck reference — required
  AGENT-section.md       ← inline embed version; appended to .flowdeck/AGENT.md on --local install — required
  blueprints/
    <name>-init/
      TODO.md            ← idempotent scaffold of the working directory
    <name>-add-<item>/   ← if the deck has configurable items
      TODO.md
    <name>-sync/         ← if the deck pulls from an external source on demand
      TODO.md
  energy-cards/
    *.md.template        ← one per document type; plain markdown, no frontmatter
```

The folder name is the deck name. `flowdeck install <name>` resolves to `flowdeck/decks/<name>/manifest.json`.

### Deck-Design Principle

Decks follow a converged principle (first seen in both `farmdeck` and `emaildeck`): **deterministic scripts scaffold cards; the model only enriches**. Applied:

- **Scaffold phase** (script): deterministic logic creates the card folder structure, populates data companions (index files, source data), and seeds the `## BOT` section with mechanics — no human choice.
- **Enrichment phase** (Claude): the model reads the populated card, surfaces findings or decisions for human review under `## HUMAN`, and optionally marks tasks complete.

This split cleanly separates concerns: scripts handle reproducible mechanical intake (deduplication, normalization, schema enforcement); the model handles judgment (triage, routing, pattern recognition). Decks using this pattern are more robust to re-runs and safer to automate.

### `manifest.json` format

```json
{
  "name": "<name>",
  "version": "0.1.0",
  "agentMd": "AGENT.md",
  "blueprints": ["<name>-init", "<name>-add-<item>"],
  "energyCards": ["ITEM.md.template"],
  "scripts": ["scripts/tool.js"],
  "description": "one-line deck description"
}
```

`scripts` is optional — list any runtime helper scripts the deck ships (relative to the deck root). `flowdeck install` copies them into the project's `_scripts/<name>/` runtime prefix (the same convention as `_energy-cards/`), and the deck's init blueprint moves them into the deck's working directory.

### Card anatomy

Every card folder contains two files:

- **Data companion** (`EVENTS.md`, `FILTER.md`, `CONTACT.md`, etc.) — structured data written by a blueprint or sync card. Overwritten on each sync. Do not edit manually.
- **`TODO.md`** — flowdeck tasks. Sections: `## BOT` (bot executes), `## HUMAN` (you handle), `## ACTIONS` (inactive; move to `## BOT` to activate).

The `## ACTIONS` pattern:
```markdown
## ACTIONS

<!-- Move an item to ## BOT to activate it, then play this card. -->

- [ ] send-to-crunchdeck — route this finding to the product backlog
- [ ] archive
```

### Blueprint lifecycle

Every blueprint's `TODO.md` declares its lifecycle on line 2 as an HTML comment:
`<!-- lifecycle: X -->`. Four values are canonical:

| Lifecycle | Meaning | Melds? | Engine-enforced |
|---|---|---|---|
| `idempotent` | Re-runnable scaffold; creates only what's missing (e.g. `*-init`). | yes (once) | no — convention |
| `one-shot` | Runs once to completion, then melds. | yes | no — convention |
| `recurring` | Auto-resets after each play; regenerates or re-syncs on demand. | never (auto-reset) | **yes** |
| `standing` | Persistent runtime card scaffolded once at init; replayed in place. | never | no — convention |

Only `recurring` has engine behavior: after a recurring card is played, flowdeck resets
its `## BOT` checkboxes and does not meld it (the CLI engine matches
`<!-- lifecycle: recurring -->` explicitly). The other three are documentary conventions
the play/turn agent reads — the CLI neither validates nor switches on them.

**Standing cards.** A standing card (an inbox, a filter listing, a state document's
companion `TODO.md`) is a persistent card that lives in the deck's working directory and
is replayed rather than melded. **Ship every standing card as its own blueprint** carrying
`<!-- lifecycle: standing -->` (or `recurring` if it self-regenerates), listed in
`manifest.blueprints[]`, and scaffolded by the deck's `*-init` blueprint via a copy-if-
missing step:

```
- [ ] Scaffold standing cards from blueprints — copy each blueprint's `TODO.md` to the
      target path if it does not already exist:
  - `.flowdeck/_blueprints/<deck>-<purpose>/TODO.md` → `.flowdeck/.<deck>/<path>/TODO.md`
```

Do **not** inline a standing card's body in the init blueprint, and do **not** ship it as
an energy-card template — both hide the card from the manifest and from `blueprint update`.
The blueprint *folder* is named `<deck>-<purpose>`; the card's H1 stays the natural runtime
title (e.g. `# Inbox`). See ADR-0002.

### Blueprint rules

- **Init blueprints** must be idempotent — check before creating, skip silently if present. End with a commit: `git add .flowdeck/.<name> && git commit -m "deck: init <name>"`.
- **Add-item and sync blueprints** must never overwrite an existing `TODO.md` — only scaffold when missing to preserve the human's notes. Data companions (the non-TODO companion file) may be overwritten.
- **Referencing energy-card templates** from a blueprint: use the `_energy-cards/` prefix, e.g. `_energy-cards/ITEM.md.template`. This is how flowdeck resolves templates at runtime.
- **MCP-dependent blueprints**: always check connector availability first (e.g. `mcp__claude_ai_Windsor_ai__get_connectors`). Surface a `## HUMAN` gap with setup instructions if the required connector is absent — never fail silently.

Use `flowdeck blueprint use new-deck <name>` to scaffold a deck with full Claude assistance.

### Linting

Every deck source is checked mechanically by `tools/decks-lint.mjs` (plain Node, zero
deps). Run it before opening a PR:

```bash
node tools/decks-lint.mjs
```

It reports a finding and exits non-zero for any of: a manifest missing a required field
(`name`, `version`, `agentMd`, `blueprints`, `energyCards`, `description`; `scripts` is
optional); a manifest entry that does not resolve to a file, or a file not listed in the
manifest (orphan); an `AGENT-section.md` that is not a single `## ` heading subtree; an
energy-card carrying YAML frontmatter; a blueprint `TODO.md` whose line 2 is not a valid
`<!-- lifecycle: … -->` marker; a `_energy-cards/*` or `_scripts/*` reference inside a
blueprint that does not resolve; or a registry row in this file (or in the
gitignored `LOCAL-DECKS.md`, merged when present) that references a blueprint
absent from the manifest. CI runs it on every push and pull request
(`.github/workflows/decks-lint.yml`). See `.flowdeck/deck-test-harness/SPEC.md` for the
full check definitions.
