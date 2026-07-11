---
lifecycle: ritual
recurrence: on-demand
---

# gitdeck-init

> **Sleeve resident.** This is a ritual card: it lives in the deck's own `_sleeve/` (`.flowdeck/.gitdeck/_sleeve/`), is played in place, and is never melded. Replaying it **is** `flowdeck install gitdeck --repair` — every step is create-if-missing, so a re-play converges the working tree without clobbering local tuning.

## BOT

- [ ] **Migrate legacy `_`-prefixed instrument folders** (installs from the ADR-0005/06 rename campaign, before the reversal in gitdeck 0.4.0). For each pair below, if the old path exists and the new one does not, rename it with `git mv <old> <new>` (plain `mv` if untracked). If **both** exist, do not merge — surface the conflict under `## HUMAN` and leave both untouched. If only the new name exists (or neither), skip silently — replay stays idempotent:
  - `.flowdeck/.gitdeck/repos/` → `.flowdeck/.gitdeck/repos/`
  - `.flowdeck/_sleeve/gitdeck-init/` → `.flowdeck/.gitdeck/_sleeve/gitdeck-init/` (sleeve cards moved from the board's root `_sleeve/` into each deck's own — `flowdeck update gitdeck` also performs this relocation itself)
  After any move, update literal old-path references inside the migrated instance's own files (instrument `TODO.md`s, config/index docs) to the plain paths; the instance's `AGENT.md` copies are refreshed from the deck package by `flowdeck update gitdeck` itself.

- [ ] This card is idempotent — do not stop early if `.flowdeck/.gitdeck/` already exists. For each path below, create it only if missing; skip silently if it already exists:
  - `.flowdeck/.gitdeck/`
  - `.flowdeck/.gitdeck/repos/`

- [ ] Add `.*` to `.flowdeck/.flowdeckignore` if not already present, so `.gitdeck/` is excluded from `flowdeck turn`.

- [ ] Scaffold `.flowdeck/.gitdeck/REPOS.md` if it does not already exist:
  ```markdown
  # Repo Watch List

  Edit this file to define which GitHub repos gitdeck monitors and how.
  Each block maps to a repo card under `repos/`. Duplicate the block to add more repos.

  ---

  ## Repo: [owner/repo]

  - **Category**: <!-- owned | competitor | provider | consumer | benchmark -->
  - **Watch**: <!-- releases, issues, prs — comma-separated; default: releases -->
  - **Watch config**: <!-- what signals matter? e.g. "breaking changes in API surface" -->
  - **Slug**: <!-- kebab-case folder name under repos/, e.g. acme-my-lib -->

  ---
  ```

- [ ] Scaffold `.flowdeck/.gitdeck/repos/TODO.md` if it does not already exist:
  ```markdown
  ---
  lifecycle: recurring
  recurrence: on-demand
  ---

  # repos

  ## BOT

  - [ ] List all repo cards in `repos/` (subdirectories that contain a `REPO.md`).
  - [ ] If no repos are configured, note under `## HUMAN` to add one with `flowdeck blueprint use gitdeck-add-repo` and stop.
  - [ ] Check if `.flowdeck/.crunchdeck/profile/PROFILE.md` exists. If it does, read it for product context — use when scoring finding relevance across all repos.
  - [ ] For each repo card, play its `TODO.md` — fetch new activity and create finding cards under `repos/<slug>/findings/`.
  - [ ] Report under `## HUMAN`: repos run, findings created per repo, any that errored or found nothing.

  ## HUMAN

  #### COMMENTS
  ```

- [ ] Scaffold `.flowdeck/.gitdeck/repos/mock-repo-card/REPO.md` if it does not already exist:
  ```markdown
  # Repo: example/repo

  | Field | Value |
  |-------|-------|
  | Category | benchmark |
  | Watch | releases |

  ## Watch Config

  > Watch for new releases to compare against roadmap themes.

  ## Run Log

  | Date | Findings | Cards created |
  |------|----------|---------------|
  ```

- [ ] Scaffold `.flowdeck/.gitdeck/repos/mock-repo-card/TODO.md` if it does not already exist:
  ```markdown
  # example/repo

  ## BOT

  - [ ] Read `REPO.md` for watch types and config.
  - [ ] Check if `.flowdeck/.crunchdeck/profile/PROFILE.md` exists and read it for relevance context.
  - [ ] Fetch configured signals via `gh api`:
    - **releases**: `gh api repos/example/repo/releases --limit 5`
    - **issues**: `gh api repos/example/repo/issues?state=open&sort=created --limit 10`
    - **prs**: `gh api repos/example/repo/pulls?state=open&sort=created --limit 10`
  - [ ] For each item not already in `findings/` (check by date + title), assess relevance against PROFILE.md context. Discard noise.
  - [ ] For each qualifying item, create `findings/<YYYY-MM-DD>-<slug>/`:
    - Scaffold `FINDING.md` from `_energy-cards/FINDING.md.template` — fill all fields; add a `## Relevance` line if PROFILE.md was read
    - Create `TODO.md` with `## ACTIONS` containing `send-to-crunchdeck`, `create-card`, and `discard`
  - [ ] Append a run log entry to `REPO.md` under `## Run Log`.
  - [ ] If no new findings, note under `## HUMAN` and stop.

  ## HUMAN

  #### COMMENTS
  ```

- [ ] Scaffold `.flowdeck/.gitdeck/ACTIONS.md` if it does not already exist:
  ```markdown
  # gitdeck Actions

  Reference for all actions available on finding cards.
  To activate an action, move it from `## ACTIONS` in the card's `TODO.md` into `## BOT` (bot executes) or `## HUMAN` (you handle it).

  ---

  ## send-to-crunchdeck

  Forward this finding to the crunchdeck product inbox for triage. Creates a card at `.flowdeck/.crunchdeck/crunchdeck-inbox/<YYYY-MM-DD>-<slug>/`. Only runs if `.flowdeck/.crunchdeck/` exists — stops silently otherwise.

  **Trigger:** `- [ ] send-to-crunchdeck`

  When activated:
  1. Check `.flowdeck/.crunchdeck/` exists — if not, note under `## HUMAN` and stop.
  2. Read `FINDING.md` for title, repo, type, date, summary, and relevance note.
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

- [ ] Scaffold `.flowdeck/.gitdeck/AGENT.md` if it does not already exist — copy verbatim from `_energy-cards/gitdeck-AGENT.md`.

- [ ] Commit **only if this replay changed anything** (a repair replay on an already-scaffolded project produces no diff): `git add .flowdeck/.gitdeck && git diff --cached --quiet || git commit -m "deck: init gitdeck"`.

## HUMAN

#### COMMENTS
