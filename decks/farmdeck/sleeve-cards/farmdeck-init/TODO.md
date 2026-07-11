---
lifecycle: ritual
recurrence: on-demand
---

# farmdeck-init

> **Sleeve resident.** This is a ritual card: it lives in the deck's own `_sleeve/` (`.flowdeck/.farmdeck/_sleeve/`), is played in place, and is never melded. Replaying it **is** `flowdeck install farmdeck --repair` — every step is create-if-missing, so a re-play converges the working tree without clobbering local tuning.

## BOT

- [ ] **Migrate legacy `_`-prefixed instrument folders** (installs from the ADR-0005/06 rename campaign, before the reversal in farmdeck 0.4.0). For each pair below, if the old path exists and the new one does not, rename it with `git mv <old> <new>` (plain `mv` if untracked). If **both** exist, do not merge — surface the conflict under `## HUMAN` and leave both untouched. If only the new name exists (or neither), skip silently — replay stays idempotent:
  - `.flowdeck/.farmdeck/farmdeck-inbox/` → `.flowdeck/.farmdeck/farmdeck-inbox/`
  - `.flowdeck/.farmdeck/prospects/` → `.flowdeck/.farmdeck/prospects/`
  - `.flowdeck/.farmdeck/won/` → `.flowdeck/.farmdeck/won/`
  - `.flowdeck/.farmdeck/dropped/` → `.flowdeck/.farmdeck/dropped/`
  - `.flowdeck/.farmdeck/pipeline/` → `.flowdeck/.farmdeck/pipeline/`
  - `.flowdeck/_sleeve/farmdeck-init/` → `.flowdeck/.farmdeck/_sleeve/farmdeck-init/` (sleeve cards moved from the board's root `_sleeve/` into each deck's own — `flowdeck update farmdeck` also performs this relocation itself)
  After any move, update literal old-path references inside the migrated instance's own files (instrument `TODO.md`s, config/index docs) to the plain paths; the instance's `AGENT.md` copies are refreshed from the deck package by `flowdeck update farmdeck` itself.

- [ ] This ritual is idempotent — do not stop early if `.flowdeck/.farmdeck/` already exists. For each path below, create it only if missing; skip silently if it already exists:
  - `.flowdeck/.farmdeck/`
  - `.flowdeck/.farmdeck/farmdeck-inbox/`
  - `.flowdeck/.farmdeck/prospects/`
  - `.flowdeck/.farmdeck/won/`
  - `.flowdeck/.farmdeck/dropped/`
  - `.flowdeck/.farmdeck/pipeline/`

- [ ] Scaffold data documents from energy card templates — copy each template to the target path only if it does not already exist:
  - `_energy-cards/PIPELINE.md.template` → `.flowdeck/.farmdeck/pipeline/PIPELINE.md`
  - `_energy-cards/INBOX.md.template` → `.flowdeck/.farmdeck/farmdeck-inbox/INBOX.md`
  - `_energy-cards/PROSPECTS.md.template` → `.flowdeck/.farmdeck/prospects/PROSPECTS.md`
  - `_energy-cards/WON.md.template` → `.flowdeck/.farmdeck/won/WON.md`
  - `_energy-cards/DROPPED.md.template` → `.flowdeck/.farmdeck/dropped/DROPPED.md`

- [ ] Add `.*` to `.flowdeck/.flowdeckignore` if not already present, so `.farmdeck/` is excluded from `flowdeck turn`.

- [ ] Scaffold the five **instrument cards** — one per operational folder, each played in place (never melded). Per the folder-is-card rule (sleeve `SPEC.md`) these are *not* `_sleeve/` residents and *not* blueprints: they live on the `.farmdeck/` folder they act on, carry `lifecycle: recurring` frontmatter (so playing one resets its `## BOT` checkboxes for the next run), and are excluded from `turn` sweeps via the `.*` ignore rule above. Play one with `flowdeck play .farmdeck/<area>` or in place. Write each file **only if it does not already exist** (never clobber local tuning):

  - `.flowdeck/.farmdeck/farmdeck-inbox/TODO.md`:
    ```markdown
    ---
    lifecycle: recurring
    ---

    # farmdeck-inbox

    ## BOT

    - [ ] List every `farmdeck-inbox/*/PROSPECT.md` — extract slug, name, company, source, added date.
    - [ ] Rewrite `INBOX.md` with an updated incoming-leads table.
    - [ ] Surface each unqualified lead under `## HUMAN` as a `- [ ]` item with a one-line summary.

    ## HUMAN

    ## ACTIONS

    <!-- Move an item to ## BOT to activate it, then play this card. -->

    - [ ] qualify — move a lead folder from farmdeck-inbox/ to prospects/, set Stage to Seed
    - [ ] drop — move a lead folder to dropped/, set Stage to Dropped
    ```

  - `.flowdeck/.farmdeck/prospects/TODO.md`:
    ```markdown
    ---
    lifecycle: recurring
    ---

    # Prospects

    ## BOT

    - [ ] Scan all `prospects/*/PROSPECT.md` — extract slug, name, company, stage, last-interaction date.
    - [ ] Group by stage (Seed / Nurture / Active). Flag any whose last interaction is older than the stale threshold in `pipeline/PIPELINE.md`.
    - [ ] Rewrite `PROSPECTS.md` with an updated pipeline table and "needs attention" list.
    - [ ] Surface the same summary under `## HUMAN`.

    ## HUMAN

    ## ACTIONS

    <!-- Move an item to ## BOT to activate it, then play this card. -->

    - [ ] add-prospect — open farmdeck-add-prospect blueprint
    - [ ] advance-stage — promote a named prospect to the next stage
    - [ ] drop — move a named prospect to dropped/
    - [ ] win — move a named prospect to won/
    ```

  - `.flowdeck/.farmdeck/won/TODO.md`:
    ```markdown
    ---
    lifecycle: recurring
    ---

    # Won

    ## BOT

    - [ ] Scan all `won/*/PROSPECT.md` — extract slug, name, company, close date.
    - [ ] Rewrite `WON.md` with an updated closed-deals table.
    - [ ] Surface the list under `## HUMAN`.

    ## HUMAN

    ## ACTIONS

    <!-- Move an item to ## BOT to activate it, then play this card. -->

    - [ ] re-engage — move a won deal back to prospects/ as a new opportunity
    ```

  - `.flowdeck/.farmdeck/dropped/TODO.md`:
    ```markdown
    ---
    lifecycle: recurring
    ---

    # Dropped

    ## BOT

    - [ ] Scan all `dropped/*/PROSPECT.md` — extract slug, name, company, drop date, reason.
    - [ ] Rewrite `DROPPED.md` with an updated dropped-prospects table.
    - [ ] Surface the list under `## HUMAN`.

    ## HUMAN

    ## ACTIONS

    <!-- Move an item to ## BOT to activate it, then play this card. -->

    - [ ] re-engage — move a dropped prospect back to farmdeck-inbox/ for re-evaluation
    ```

  - `.flowdeck/.farmdeck/pipeline/TODO.md`:
    ```markdown
    ---
    lifecycle: recurring
    ---

    # Pipeline Overview

    ## BOT

    - [ ] Read `PIPELINE.md` (sibling in `pipeline/`) for stage definitions and stale threshold.
    - [ ] Scan all `prospects/*/PROSPECT.md` — extract slug, name, company, stage, last-interaction date.
    - [ ] Group by stage (Seed / Nurture / Active). Flag any whose last interaction is older than the stale threshold.
    - [ ] Surface a pipeline summary table and a "needs attention" list under `## HUMAN`.

    ## HUMAN

    ## ACTIONS

    <!-- Move an item to ## BOT to activate it, then play this card. -->

    - [ ] add-prospect — open farmdeck-add-prospect blueprint
    ```

- [ ] Scaffold `.flowdeck/.farmdeck/README.md` if it does not already exist:
  ```
  # farmdeck

  Prospection pipeline. Tracks contacts through Inbox → Seed → Nurture → Active → Won / Dropped.

  ## Usage
  - Inbox: play `farmdeck-inbox/TODO.md`
  - Pipeline status: play `pipeline/TODO.md`
  - Prospects: play `prospects/TODO.md`
  - Add prospect: open `farmdeck-add-prospect` blueprint
  - Work a prospect: play `prospects/<slug>/TODO.md`

  ## Programmatic intake
  flowdeck create-card farmdeck <column> <slug> --data '{"name":"...","email":"...","stage":"seed"}'
  ```

- [ ] Commit **only if this replay changed anything** (a repair replay on an already-scaffolded project produces no diff): `git add .flowdeck/.farmdeck && git diff --cached --quiet || git commit -m "deck: init farmdeck"`.

## HUMAN

#### COMMENTS
