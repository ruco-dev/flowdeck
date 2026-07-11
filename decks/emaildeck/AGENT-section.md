## emaildeck

The `.flowdeck/.emaildeck/` directory holds Gmail filter rules as cards. Each filter card defines a Gmail search query, a label to apply to matched threads, and default tasks to populate every message card it creates.

**First run (setup / inboxing split):**
- `flowdeck install emaildeck --local` plays `emaildeck-init` — scaffolds structure only (folders, runner, `ACTIONS.md`, mocks, `AGENT.md`).
- `flowdeck play emaildeck-setup` — first-run ritual: auth preflight, context-detected filters (creamdeck domains, crunchdeck profile), interview to mint filters, first wide-range backfill fetch. Replay to extend/repair filters.
- `flowdeck play mail-inbox` — recurring inboxing thereafter (`recurrence: daily`; schedule with the `schedule-inboxing` action).

**Filter cards (created by `emaildeck-add-filter`):**
- `.flowdeck/.emaildeck/filters/<slug>/` — `FILTER.md` + `TODO.md`
  - `FILTER.md` — Gmail query, label name, default task template, run log
  - `TODO.md` — when played: fetch matching threads → apply label → create message cards

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

**To play a filter card**, read the `TODO.md` in `.flowdeck/.emaildeck/filters/<slug>/` and execute its `## BOT` tasks. Domain-based filters run via `emaildeck_run.js` — a Node script that handles auth, Gmail query, labeling, and card scaffolding without a model. Filters that need summarization or thematic classification can add a `## Enrichment` section to `FILTER.md`; the runner will pass each thread to the model for only that step.

**Runner:** `.flowdeck/.emaildeck/_scripts/emaildeck_run.js --filter <slug>`
- Reads `FILTER.md` (query, label, `## To Domain`, default tasks, date range)
- Resolves `filters/` and `mail-inbox/` by plain name with a `_`-prefixed fallback (works in a not-yet-migrated instance)
- Refreshes the Google OAuth token if needed (`~/.config/flowdeck/tokens/google.json`)
- Deduplicates by checking existing thread IDs in `mail-inbox/` EMAIL.md files
- Derives the `after:` date from the last Run Log entry (falls back to last 30 days)
- Appends a row to `## Run Log` on every run
- Includes `send-to-creamdeck` / `send-to-crunchdeck` in each new card's `## ACTIONS` menu automatically, if `.flowdeck/.creamdeck/` / `.flowdeck/.crunchdeck/` exist

**Instrument cards (folder cards — scaffolded by `emaildeck-init`, played in place, never melded):** `filters/`, `mail-inbox/`, `drafts/`, `mail-archive/` each carry a `lifecycle: recurring` + `recurrence:` `TODO.md`. Per ADR-0006 a folder with a playable root `TODO.md` gets a plain name; the `.*` `.flowdeckignore` rule (not the folder name) keeps `.emaildeck/` out of `flowdeck turn`. Play one with the bare leaf `flowdeck play mail-inbox`.

**Blueprints:**
- `emaildeck-add-filter` — create a new filter card
- `emaildeck-compose` — compose a message draft from scratch into `drafts/`
- `emaildeck-backfill-bodies` — one-shot repair: fetch full threads and backfill any `EMAIL.md` with an empty `## Body`/`## Snippet`
- `emaildeck-digest` — on-demand newsletter digest ritual (`skills: content-digest`): fetch unread newsletters → distil per-project signals → write `_digests/<YYYY-MM-DD>.md` with triage checkboxes → run the action map (Keep / Deep / Delete / Skill → mdblu / AddCard → `flowdeck file`)

**Sleeve rituals:** `sleeveCards` = `emaildeck-init` (structure; auto-played on install, replay = install-repair) and `emaildeck-setup` (first-run filter establishment; played on demand).
