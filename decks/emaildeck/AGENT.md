# emaildeck

The `.flowdeck/.emaildeck/` directory holds email filter rules as cards. Each filter card defines a search query (Gmail or Outlook), a label/category to apply to matched messages, and default tasks to populate every message card it creates.

**Supported providers:**
- **Gmail** (default) — requires `flowdeck auth google`
- **Microsoft Outlook** — requires `flowdeck auth microsoft`

**Setup:**
- **Gmail**: Run `flowdeck auth google` to authorize
- **Outlook**: Run `flowdeck auth microsoft` to authorize (requires Azure App Registration)

**First run (setup / inboxing split):**
- `flowdeck install emaildeck --local` plays `emaildeck-init` — scaffolds **structure only** (folders, runner, `ACTIONS.md`, mocks, `AGENT.md`).
- `flowdeck play emaildeck-setup` — the first-run ritual: auth preflight, context-detected filters (creamdeck domains, crunchdeck profile), human interview to mint filters via `emaildeck-add-filter`, and a first wide-range backfill fetch. Replay to extend or repair the filter set.
- `flowdeck play mail-inbox` — recurring inboxing thereafter: sweep the established filters, fetch new threads, create message cards.

**Filter cards (created by `emaildeck-add-filter`):**
- `.flowdeck/.emaildeck/filters/<slug>/` — `FILTER.md` + `TODO.md`
  - `FILTER.md` — provider, search query, label/category name, default task template, run log
  - `TODO.md` — when played: fetch matching messages → apply label/category → create message cards

**Message cards (created when a filter is played):**
- `.flowdeck/.emaildeck/mail-inbox/<YYYY-MM-DD>-<thread-slug>/` — `EMAIL.md` + `TODO.md`
  - `EMAIL.md` — thread metadata (subject, sender, date, snippet, thread ID, label applied)
  - `TODO.md` — populated from the filter's `## Default Tasks` block
- `mail-archive/` — destination pile for archived message cards (moved here when the `archive` action runs)

**Draft cards (composed by hand or staged from replies):**
- `.flowdeck/.emaildeck/drafts/<slug>/` — outbound staging for both reply drafts and new messages
  - `MESSAGE.md` — To/Cc/Bcc/Subject metadata table + `## Body`; local `.md` is the source of truth, Gmail draft ID row populated after `push-to-gmail` runs
  - `TODO.md` — `push-to-gmail` / `improve-language` ACTIONS; move to `## BOT` to activate
- Reply drafts (staged from message cards via `draft-reply`) also land here alongside compose drafts

**To play a filter card:**
1. Open `.flowdeck/.emaildeck/filters/<slug>/TODO.md`
2. Move action (e.g., `fetch-emails`) from `## ACTIONS` into `## BOT`
3. Play the card: `flowdeck play <slug>` or via the `mail-inbox` sweep
4. The filter runner (`emaildeck_run.js`) executes — fetches emails, applies label/category, creates message cards

**Filter runner:** `.flowdeck/.emaildeck/_scripts/emaildeck_run.js --filter <slug>` (invoked by flowdeck when card is played)
- Reads `FILTER.md` (provider, query, label, `## To Domain`, default tasks, date range)
- Resolves `filters/` and `mail-inbox/` by plain name, falling back to the `_`-prefixed legacy names — so it runs correctly in a not-yet-migrated instance
- Refreshes OAuth token if needed (Gmail or Microsoft, auto-detects)
- Deduplicates by checking existing message IDs in `mail-inbox/` EMAIL.md files
- Derives date range from last Run Log entry (falls back to last 30 days)
- Appends a row to `## Run Log` on every run
- Includes `send-to-creamdeck` / `send-to-crunchdeck` in each new card's `## ACTIONS` menu automatically, if those decks exist
- Optional: `## Enrichment` section in FILTER.md for per-message model steps (summarize, classify, etc.)

**Instrument cards (folder cards — scaffolded by `emaildeck-init`, played in place, never melded):**

Each operational folder carries its own `TODO.md` with `lifecycle: recurring` frontmatter and a `recurrence:` value. Per ADR-0006, a folder that carries a playable root `TODO.md` earns a plain name — `_` is reserved for unplayable piles; turn-exclusion is frontmatter's job (the sub-deck `.*` `.flowdeckignore` rule keeps the whole `.emaildeck/` tree out of `flowdeck turn`, and `recurrence:` records each instrument's cadence). These live on the folder they act on — they are **not** `_sleeve/` residents and **not** blueprints. Play one with the bare leaf `flowdeck play mail-inbox` (or `filters` / `drafts` / `mail-archive`); a play resets its `## BOT` checkboxes for the next run.

- `.flowdeck/.emaildeck/filters/TODO.md` (`recurrence: on-demand`) — list filter cards and their last run date
- `.flowdeck/.emaildeck/mail-inbox/TODO.md` (`recurrence: daily`) — sweep all valid filters, fetching new threads into message cards; ships a `schedule-inboxing` action to install a crontab line or scheduled agent
- `.flowdeck/.emaildeck/drafts/TODO.md` (`recurrence: on-demand`) — push staged reply/compose drafts to Gmail
- `.flowdeck/.emaildeck/mail-archive/TODO.md` (`recurrence: on-demand`) — list archived cards (destination pile, no action)

**Blueprints (mortal templates — each play mints a new meldable card):**
- `emaildeck-add-filter` — create a new filter card
- `emaildeck-compose` — compose a message draft from scratch into `drafts/`
- `emaildeck-backfill-bodies` — one-shot repair: fetch full threads and backfill any `EMAIL.md` with an empty `## Body`/`## Snippet`
- `emaildeck-digest` — newsletter digest ritual (`lifecycle: recurring`, `recurrence: on-demand`, `skills: content-digest`): fetch unread newsletters provider-aware → apply `BOT-READ` as each is read → distil per-project signals against the host's active-projects list → write a dated `_digests/<YYYY-MM-DD>.md` with per-item triage checkboxes → execute the action map on the human's selections. Unlike the mortal templates, a play produces a dated digest doc rather than a meldable card. Action map: **Keep** (`TO-READ`) / **Deep** (`_digests/deep/`) / **Delete** (`DELETE`, never physically deletes) / **Skill** (mdblu `/add-skill` PR when public, host local skills dir when private) / **AddCard** (`flowdeck file <deck-path> <slug>`). Generalized from a retired internal `gmail-diggest` ritual; the digest doc layout lives in `_energy-cards/DIGEST.md.template`.

**Digest artifacts:**
- `.flowdeck/.emaildeck/_digests/` — dated digest docs written by `emaildeck-digest` (scaffolded by `emaildeck-init`). `_digests/deep/` holds expanded per-item research. `_digests/` stays a `_`-pile: it holds no playable root `TODO.md`.

**Sleeve residents & `sleeveCards`:**

The manifest's `sleeveCards` field lists two cards: `emaildeck-init` and `emaildeck-setup`. Both are **rituals** (`lifecycle: ritual`, `recurrence: on-demand`): `flowdeck install emaildeck` copies them into the deck's own `_sleeve/` (`.flowdeck/.emaildeck/_sleeve/`). Install auto-plays only `emaildeck-init` (structure); `emaildeck-setup` is played on demand for first-run filter establishment (and re-played to extend/repair the filter set). Replaying `emaildeck-init` is `flowdeck install emaildeck --repair` (every step create-if-missing). Neither is ever melded. (Two-entry `sleeveCards` follows the crunchdeck precedent of `crunchdeck-init` + `publish-readiness-audit`.)

`sleeveCards` holds **no operational instruments** — every emaildeck instrument (inbox / filters / drafts / archive) is folder-scoped and therefore a folder card under `.emaildeck/`, not a sleeve resident. The board's root `_sleeve/` is reserved for project-generic / cross-cutting instruments; a deck's own `_sleeve/` holds its rituals. When converting the other decks: an instrument that acts on a specific `.<deck>/` folder becomes a folder card; only rituals — init, setup, and any genuinely cross-cutting instrument — belong in `sleeveCards`.
