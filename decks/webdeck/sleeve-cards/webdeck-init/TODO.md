---
lifecycle: ritual
recurrence: on-demand
---

# webdeck-init

> **Sleeve resident.** This is a ritual card: it lives in the deck's own `_sleeve/` (`.flowdeck/.webdeck/_sleeve/`), is played in place, and is never melded. Replaying it **is** `flowdeck install webdeck --repair` — every step is create-if-missing, so a re-play converges the working tree without clobbering local tuning.

## BOT

- [ ] **Migrate legacy `_`-prefixed instrument folders** (installs from the ADR-0005/06 rename campaign, before the reversal in webdeck 0.4.0). For each pair below, if the old path exists and the new one does not, rename it with `git mv <old> <new>` (plain `mv` if untracked). If **both** exist, do not merge — surface the conflict under `## HUMAN` and leave both untouched. If only the new name exists (or neither), skip silently — replay stays idempotent:
  - `.flowdeck/.webdeck/queries/` → `.flowdeck/.webdeck/queries/`
  - `.flowdeck/_sleeve/webdeck-init/` → `.flowdeck/.webdeck/_sleeve/webdeck-init/` (sleeve cards moved from the board's root `_sleeve/` into each deck's own — `flowdeck update webdeck` also performs this relocation itself)
  After any move, update literal old-path references inside the migrated instance's own files (instrument `TODO.md`s, config/index docs) to the plain paths; the instance's `AGENT.md` copies are refreshed from the deck package by `flowdeck update webdeck` itself.

- [ ] This ritual is idempotent — do not stop early if `.flowdeck/.webdeck/` already exists. For each path below, create it only if missing; skip silently if it already exists:
  - `.flowdeck/.webdeck/`
  - `.flowdeck/.webdeck/queries/`

- [ ] Add `.*` to `.flowdeck/.flowdeckignore` if not already present, so `.webdeck/` is excluded from `flowdeck turn`.

- [ ] Scaffold `.flowdeck/.webdeck/QUERIES.md` if it does not already exist:
  ```markdown
  # Search Queries

  Edit this file to define which searches webdeck runs.
  Each block maps to a query card under `queries/`. Duplicate the block to add more queries.

  ---

  ## Query: [name]

  - **Intent**: <!-- category | competitor | user-pain | trends -->
  - **Terms**: <!-- search terms, one per line or comma-separated -->
  - **Slug**: <!-- kebab-case folder name under queries/ -->

  ---
  ```

- [ ] Scaffold `.flowdeck/.webdeck/queries/TODO.md` if it does not already exist:
  ```markdown
  ---
  lifecycle: recurring
  recurrence: on-demand
  ---

  # queries

  ## BOT

  - [ ] List all query cards in `queries/` (subdirectories that contain a `QUERY.md`).
  - [ ] If no queries are configured, note under `## HUMAN` to add one with `flowdeck blueprint use webdeck-add-query` and stop.
  - [ ] Check if `.flowdeck/.crunchdeck/profile/PROFILE.md` exists. If it does, read it for product context — use when scoring finding relevance across all queries.
  - [ ] For each query card, play its `TODO.md` — run searches and create finding cards under `queries/<slug>/findings/`.
  - [ ] Report under `## HUMAN`: queries run, findings created per query, any that found nothing.

  ## HUMAN

  #### COMMENTS
  ```

- [ ] Scaffold `.flowdeck/.webdeck/queries/mock-query-card/QUERY.md` if it does not already exist:
  ```markdown
  # Query: Example Query

  | Field | Value |
  |-------|-------|
  | Intent | category |
  | Category | example |

  ## Search Terms

  "example product" site:news.ycombinator.com OR site:reddit.com

  ## Run Log

  | Date | Results scanned | Cards created |
  |------|----------------|---------------|
  ```

- [ ] Scaffold `.flowdeck/.webdeck/queries/mock-query-card/TODO.md` if it does not already exist:
  ```markdown
  # Example Query

  ## BOT

  - [ ] Read `QUERY.md` for search terms and intent.
  - [ ] Check if `.flowdeck/.crunchdeck/profile/PROFILE.md` exists and read it for relevance context.
  - [ ] Run 2–3 searches using the terms from `QUERY.md`. Focus on: new competitor features, community discussions (HN, Reddit), analyst takes, trend signals.
  - [ ] For each meaningful result not already in `findings/`, assess relevance against PROFILE.md context. Discard noise.
  - [ ] For each qualifying result, create `findings/<YYYY-MM-DD>-<slug>/`:
    - Scaffold `FINDING.md` from `_energy-cards/FINDING.md.template` — fill all fields; add a `## Relevance` line if PROFILE.md was read
    - Create `TODO.md` with `## ACTIONS` containing `send-to-crunchdeck`, `create-card`, and `discard`
  - [ ] Append a run log entry to `QUERY.md` under `## Run Log`.
  - [ ] If no qualifying results, note under `## HUMAN` and stop.

  ## HUMAN

  #### COMMENTS
  ```

- [ ] Scaffold `.flowdeck/.webdeck/ACTIONS.md` if it does not already exist:
  ```markdown
  # webdeck Actions

  Reference for all actions available on finding cards.
  To activate an action, move it from `## ACTIONS` in the card's `TODO.md` into `## BOT` (bot executes) or `## HUMAN` (you handle it).

  ---

  ## send-to-crunchdeck

  Forward this finding to the crunchdeck product inbox for triage. Creates a card at `.flowdeck/.crunchdeck/crunchdeck-inbox/<YYYY-MM-DD>-<slug>/`. Only runs if `.flowdeck/.crunchdeck/` exists — stops silently otherwise.

  **Trigger:** `- [ ] send-to-crunchdeck`

  When activated:
  1. Check `.flowdeck/.crunchdeck/` exists — if not, note under `## HUMAN` and stop.
  2. Read `FINDING.md` for title, URL, source, query, date, snippet, and relevance note.
  3. Create `.flowdeck/.crunchdeck/crunchdeck-inbox/<YYYY-MM-DD>-<slug>/FINDING.md` — copy all fields.
  4. Create `.flowdeck/.crunchdeck/crunchdeck-inbox/<YYYY-MM-DD>-<slug>/TODO.md`:
     ```
     # [Title]

     ## BOT

     ## HUMAN

     ## ACTIONS

     <!-- Move an item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

     - [ ] to-backlog — append as a candidate item in `../../backlog/BACKLOG.md`
     - [ ] to-roadmap — promote directly to `../../roadmap/ROADMAP.md` under the relevant horizon
     - [ ] to-decision — open a new ADR: `flowdeck blueprint use crunchdeck-adr <slug>`
     - [ ] discard

     #### COMMENTS
     ```

  ---

  ## create-card

  Create a flowdeck work card for this finding as an actionable task.

  **Trigger:** `- [ ] create-card`

  ---

  ## discard

  Mark this finding as reviewed and not actionable. No further action taken.

  **Trigger:** `- [ ] discard`

  ---

  <!-- Add your own actions below -->
  ```

- [ ] Scaffold `.flowdeck/.webdeck/AGENT.md` if it does not already exist — copy verbatim from `_energy-cards/webdeck-AGENT.md`.

- [ ] Commit **only if this replay changed anything** (a repair replay on an already-scaffolded project produces no diff): `git add .flowdeck/.webdeck && git diff --cached --quiet || git commit -m "deck: init webdeck"`.

## HUMAN

#### COMMENTS
