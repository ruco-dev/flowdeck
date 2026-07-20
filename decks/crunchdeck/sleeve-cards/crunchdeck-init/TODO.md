---
lifecycle: ritual
recurrence: on-demand
---

# crunchdeck-init

> **Sleeve resident.** This is a ritual card: it lives in the deck's own `_sleeve/` (`.flowdeck/.crunchdeck/_sleeve/`), is played in place, and is never melded. Replaying it **is** `flowdeck install crunchdeck --repair` — every step is create-if-missing, so a re-play converges the working tree without clobbering local tuning.

## BOT

- [ ] Read `FLOWDECK.md` for product name and description. Fall back to `package.json` name/description if not found.

- [ ] **Migrate for the rename campaigns** — apply whichever renames are applicable. For each pair below, if the old path exists and the new one does not, rename it with `git mv <old> <new>` (plain `mv` if untracked). If **both** exist, do not merge — surface the conflict under `## HUMAN` and leave both untouched. If only the new name exists (or neither), skip silently — replay stays idempotent:
  - **ADR-0005/06 reversal** (instrument folders — `_`-prefix → plain, crunchdeck 0.9.0):
    - `.flowdeck/.crunchdeck/crunchdeck-inbox/` → `.flowdeck/.crunchdeck/crunchdeck-inbox/`
    - `.flowdeck/.crunchdeck/profile/` → `.flowdeck/.crunchdeck/profile/`
    - `.flowdeck/.crunchdeck/backlog/` → `.flowdeck/.crunchdeck/backlog/`
    - `.flowdeck/.crunchdeck/roadmap/` → `.flowdeck/.crunchdeck/roadmap/`
    - `.flowdeck/.crunchdeck/stats/` → `.flowdeck/.crunchdeck/stats/`
    - `.flowdeck/.crunchdeck/launches/` → `.flowdeck/.crunchdeck/launches/`
  - **Pre-0.6.0 legacy** (storage folders — plain → `_`-prefix):
    - `.flowdeck/.crunchdeck/decisions/` → `.flowdeck/.crunchdeck/_decisions/`
  - `.flowdeck/_sleeve/crunchdeck-init/` → `.flowdeck/.crunchdeck/_sleeve/crunchdeck-init/` (sleeve cards moved from the board's root `_sleeve/` into each deck's own — `flowdeck update crunchdeck` also performs this relocation itself)
  After any move, update literal old-path references inside the migrated instance's own files (instrument `TODO.md`s, config/index docs) to match the target paths; the instance's `AGENT.md` copies are refreshed from the deck package by `flowdeck update crunchdeck` itself.

- [ ] This ritual is idempotent — do not stop early if `.flowdeck/.crunchdeck/` already exists. For each path below, create it only if missing; skip silently if it already exists:
  - `.flowdeck/.crunchdeck/`
  - `.flowdeck/.crunchdeck/crunchdeck-inbox/`
  - `.flowdeck/.crunchdeck/profile/`
  - `.flowdeck/.crunchdeck/backlog/`
  - `.flowdeck/.crunchdeck/roadmap/`
  - `.flowdeck/.crunchdeck/stats/`
  - `.flowdeck/.crunchdeck/_decisions/`
  - `.flowdeck/.crunchdeck/launches/`

- [ ] Add `.*` to `.flowdeck/.flowdeckignore` if not already present, so `.crunchdeck/` is excluded from `flowdeck turn`.

- [ ] Scaffold the six **instrument cards** — one per operational folder, each played in place (never melded). Per the folder-is-card rule (sleeve `SPEC.md`) these are *not* `_sleeve/` residents and *not* blueprints: they live on the `.crunchdeck/` folder they act on, carry `lifecycle: recurring` frontmatter (so playing one resets its `## BOT` checkboxes for the next run), and are excluded from `turn` sweeps via the `.*` ignore rule above. Play one with `flowdeck play .crunchdeck/<area>` or in place. Write each file **only if it does not already exist** (never clobber local tuning):

  - `.flowdeck/.crunchdeck/crunchdeck-inbox/TODO.md`:
    ```markdown
    ---
    lifecycle: recurring
    ---

    # crunchdeck-inbox

    ## BOT

    - [ ] List all subdirectories in this folder whose `TODO.md` has no completed routing action (`to-backlog`, `to-roadmap`, `to-decision`, or `discard`).
    - [ ] For each unrouted item, read whichever document is present — `EMAIL.md` (emaildeck), `FINDING.md` (gitdeck / webdeck) — and surface title/subject, source, date, and relevance note under `## HUMAN`.

    ## HUMAN

    #### COMMENTS
    ```

  - `.flowdeck/.crunchdeck/profile/TODO.md`:
    ```markdown
    ---
    lifecycle: recurring
    ---

    # profile

    ## BOT

    - [ ] Read current `PROFILE.md` and any recent changes in `../backlog/BACKLOG.md` and `../roadmap/ROADMAP.md`.
    - [ ] Update `PROFILE.md` if any of these changed: one-liner, elevator pitch, north-star metric, market lane, tagline candidates.
    - [ ] Flag any remaining `{{PLACEHOLDER}}` values to `## HUMAN`.

    ## HUMAN

    #### COMMENTS
    ```

  - `.flowdeck/.crunchdeck/backlog/TODO.md`:
    ```markdown
    ---
    lifecycle: recurring
    ---

    # backlog

    ## BOT

    - [ ] Check `../crunchdeck-inbox/` for unrouted cards forwarded from emaildeck, gitdeck, or webdeck. Route any that are clearly backlog candidates by moving `to-backlog` to `## BOT` on each card.

    - [ ] Review P0/P1 candidates not yet in `../roadmap/ROADMAP.md` — surface them under `## HUMAN` for promotion decision.

    ## HUMAN

    #### COMMENTS
    ```

  - `.flowdeck/.crunchdeck/roadmap/TODO.md`:
    ```markdown
    ---
    lifecycle: recurring
    ---

    # roadmap

    ## BOT

    - [ ] Read `../backlog/BACKLOG.md` Promotion Log for newly promoted items not yet in `ROADMAP.md`.
    - [ ] Add promoted items to the correct horizon (Now / Next / Later) with outcome, hypothesis, and metric tracing to PROFILE north-star.
    - [ ] Check if any "Now" items have shipped — update Status.
    - [ ] Verify cross-product dependencies are still current.

    ## HUMAN

    #### COMMENTS
    ```

  - `.flowdeck/.crunchdeck/stats/TODO.md`:
    ```markdown
    ---
    lifecycle: recurring
    ---

    # stats

    ## BOT

    - [ ] Read current `STATS.md` — extract package list, npm handles, GitHub repos.
    - [ ] Poll npm + GitHub APIs for each package: weekly downloads, monthly downloads, version, publish date, stars, issues, forks.
    - [ ] Update `STATS.md` — populate "Packages" table with current metadata, "Weekly Stats Snapshot" with current metrics.
    - [ ] Compute and surface any trends (week-over-week deltas, anomalies) under "Trends" section.

    ## HUMAN

    #### COMMENTS
    ```

  - `.flowdeck/.crunchdeck/launches/TODO.md`:
    ```markdown
    ---
    lifecycle: recurring
    ---

    # launches

    ## BOT

    ---

    ### Determine version

    - [ ] List existing launch folders under `.flowdeck/.crunchdeck/launches/` — find the highest vX.Y.Z. If none, start at v0.1.0.
    - [ ] Scan `.flowdeck/_meld/` for card `TODO.md` files that do not contain a `**Released:**` line — these represent work completed since the last release.
    - [ ] Classify each untagged meld card as: **feature** (new capability), **fix** (bug or regression), **breaking** (incompatible change). Surface the full list as a note before proceeding.
    - [ ] Infer bump level — any breaking → major, any feature → minor, fixes only → patch. Use HUMAN override if set.
    - [ ] Resolve the new version string (e.g. `v1.3.0`).

    ---

    ### Update repo

    - [ ] Set `version` in `package.json` to the resolved version (no `v` prefix).
    - [ ] Update `CHANGELOG.md`: prepend a new `## [vX.Y.Z] — YYYY-MM-DD` section. Group entries under `### Breaking Changes`, `### Features`, and `### Fixes` as appropriate. Create `CHANGELOG.md` if it does not exist.

    ---

    ### Scaffold launch record

    - [ ] Create `.flowdeck/.crunchdeck/launches/vX.Y.Z/`.
    - [ ] Scaffold `LAUNCH.md` from `_energy-cards/LAUNCH.md.template` — substitute product name from `PROFILE.md`, version, today's date, and owner from `git config user.name`. Pre-fill shipped items from the classified meld cards.
    - [ ] Create `launches/vX.Y.Z/TODO.md`:
      ```
      ---
      lifecycle: one-shot
      ---

      # launches/vX.Y.Z

      ## BOT

      - [ ] Read LAUNCH.md — flag any TBDs under ## HUMAN.

      ## HUMAN

      #### COMMENTS
      ```

    ---

    ### Ship

    - [ ] Commit: `git add package.json CHANGELOG.md && git commit -m "release: vX.Y.Z"`.
    - [ ] Tag: `git tag vX.Y.Z && git push origin HEAD --tags`.
    - [ ] Resolve npm auth:
      - If `NPM_TOKEN` is already in the environment (`echo $NPM_TOKEN` is non-empty), use it directly.
      - Otherwise, if `.env` exists and contains `NPM_TOKEN`, load it: `set -a && source .env && set +a`.
      - Ensure `.npmrc` in the project root contains `//registry.npmjs.org/:_authToken=${NPM_TOKEN}` — add the line if missing (do not commit it; add `.npmrc` to `.gitignore` if not already present).
      - Run `npm whoami` to confirm auth. If it fails, stop and surface the error under `## HUMAN` with instructions to set `NPM_TOKEN` in the environment or `.env`.
    - [ ] Publish: `npm publish`.

    ---

    ### Close out

    - [ ] Update `README.md`: diff the CHANGELOG entry against the current README — update any sections that describe the CLI API, template list, command syntax, or version references to match what shipped.
    - [ ] Add `**Released: vX.Y.Z**` to every untagged `_meld/` card `TODO.md`.
    - [ ] Commit: `git add .flowdeck/ && git commit -m "deck: annotate meld → vX.Y.Z"`.
    - [ ] Surface the released version, CHANGELOG entry, and npm publish output under `## HUMAN`.

    ## HUMAN

    #### COMMENTS
    ```

- [ ] Scaffold `.flowdeck/.crunchdeck/AGENT.md` if it does not already exist — copy verbatim from `_energy-cards/crunchdeck-AGENT.md`.

- [ ] Scaffold `.flowdeck/.crunchdeck/README.md` from `_energy-cards/README.md.template`, substituting `{{PRODUCT_NAME}}` and `{{DATE}}` (today). Repair-safe: create it if missing; if it exists, regenerate it from the current template and refresh the stamp — unless a `.flowdeck/.crunchdeck/.readme-hash` stamp already exists and no longer matches the file's current content (real evidence of a hand-edit since the last generation; a *missing* stamp is not such evidence and must not block regeneration). In that hand-edited case, leave it alone and note under `## HUMAN` that it's locally customized and may be out of sync. Write/refresh `.flowdeck/.crunchdeck/.readme-hash` (sha256 of the file) after writing or confirming it.

- [ ] Scaffold `.flowdeck/.crunchdeck/profile/PROFILE.md` from `_energy-cards/PROFILE.md.template` — substitute `{{PRODUCT_NAME}}`, `{{DATE}}`, and `{{PROMPT}}` from context.

- [ ] Scaffold `.flowdeck/.crunchdeck/backlog/BACKLOG.md` from `_energy-cards/BACKLOG.md.template` — substitute `{{PRODUCT_NAME}}` and `{{DATE}}`.

- [ ] Scaffold `.flowdeck/.crunchdeck/roadmap/ROADMAP.md` from `_energy-cards/ROADMAP.md.template` — substitute `{{PRODUCT_NAME}}`, `{{DATE}}`, and `{{OWNER}}` from `git config user.name`.

- [ ] Scaffold `.flowdeck/.crunchdeck/stats/STATS.md` from `_energy-cards/STATS.md.template` — substitute `{{PRODUCT_NAME}}` and `{{DATE}}`.

- [ ] Scaffold `.flowdeck/.crunchdeck/_decisions/ADR-0001/ADR-0001.md` from `_energy-cards/ADR.md.template` — number `ADR-0001`, title "Initial Technology Stack", Status `Accepted`. Fill Context/Decision/Rationale with plausible initial choices derived from `package.json` and `PROFILE.md` (language, runtime, key dependencies). Use `{{AUTHOR}}` from `git config user.name` and `{{DATE}}` as today.

- [ ] Create `.flowdeck/.crunchdeck/_decisions/ADR-0001/TODO.md`:
  ```
  ---
  lifecycle: one-shot
  ---

  # _decisions/ADR-0001

  ## BOT

  - [ ] Review `ADR-0001.md` for placeholder content. Update from `PROFILE.md` or `package.json` where possible.
  - [ ] Flag any unresolved items to `## HUMAN`.

  ## HUMAN

  #### COMMENTS
  ```

- [ ] Scaffold `.flowdeck/.crunchdeck/launches/v0.0.0/LAUNCH.md` from `_energy-cards/LAUNCH.md.template` — version `v0.0.0`, title "Pre-launch Baseline", Status `Archived`. Fill as a seed/bootstrap state: all checklist items marked with a note that this is the starting baseline, not a real release. Use `{{DATE}}` as today and `{{OWNER}}` from `git config user.name`.

- [ ] Create `.flowdeck/.crunchdeck/launches/v0.0.0/TODO.md`:
  ```
  ---
  lifecycle: one-shot
  ---

  # launches/v0.0.0

  ## BOT

  - [ ] Review `LAUNCH.md` for placeholder content. Update from `PROFILE.md` where possible.
  - [ ] Flag any unresolved items to `## HUMAN`.

  ## HUMAN

  ## ACTIONS

  <!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

  - [ ] npm-publish — run `npm publish` with the correct scope; confirm the package resolves from a clean install
  - [ ] tag-release — create git tag vX.Y.Z, push tag and branch to remote
  - [ ] update-docs — sync README and any hosted docs to reflect the shipped API
  - [ ] draft-announce — draft a launch post using the content angle and one-liner from PROFILE
  - [ ] capture-baseline — record the north-star metric value (defined in PROFILE) as a comment on this card before and after launch
  - [ ] annotate-meld — add `**Released: vX.Y.Z**` to every untagged `_meld/` card `TODO.md` and commit

  #### COMMENTS
  ```

- [ ] Commit **only if this replay changed anything** (a repair replay on an already-scaffolded project produces no diff): `git add .flowdeck/.crunchdeck && git diff --cached --quiet || git commit -m "deck: init crunchdeck"`.

## HUMAN

#### COMMENTS
