---
lifecycle: one-shot
---

# gitdeck-add-repo
<!-- lifecycle: one-shot -->

## BOT

- [ ] Check if `.flowdeck/.gitdeck/` exists. If not, stop and note under `## HUMAN` to run `gitdeck-init` first.

- [ ] Read `## HUMAN` below for owner/repo, category, watch types, watch config, and slug. Stop and surface any missing required values under `## HUMAN`.

- [ ] Create `.flowdeck/.gitdeck/repos/{{SLUG}}/` and `findings/` inside it.

- [ ] Scaffold `REPO.md` from `_energy-cards/REPO.md.template` — substitute `{{OWNER}}`, `{{REPO}}`, `{{CATEGORY}}`, `{{WATCH_TYPES}}`, and `{{WATCH_CONFIG}}`.

- [ ] Create `TODO.md` in `.flowdeck/.gitdeck/repos/{{SLUG}}/`:

  ```markdown
  # {{OWNER}}/{{REPO}}

  ## BOT

  - [ ] Read `REPO.md` for watch types and config.

  - [ ] Check if `.flowdeck/.crunchdeck/profile/PROFILE.md` exists and read it for relevance context.

  - [ ] Fetch configured signals via `gh api`:
    - **releases**: `gh api repos/{{OWNER}}/{{REPO}}/releases --limit 5`
    - **issues**: `gh api repos/{{OWNER}}/{{REPO}}/issues?state=open&sort=created --limit 10`
    - **prs**: `gh api repos/{{OWNER}}/{{REPO}}/pulls?state=open&sort=created --limit 10`
    - Skip types not listed in `REPO.md` Watch field.

  - [ ] For each item not already in `findings/` (check by date + title), assess relevance against PROFILE.md context if available. Discard noise.

  - [ ] For each qualifying item, create `findings/<YYYY-MM-DD>-<slug>/`:
    - Scaffold `FINDING.md` from `_energy-cards/FINDING.md.template` — fill all fields; append `## Relevance` if PROFILE.md was read
    - Create `TODO.md`:
      ```
      # [Title]

      ## BOT

      ## HUMAN

      ## ACTIONS

      - [ ] send-to-crunchdeck
      - [ ] create-card
      - [ ] discard

      #### COMMENTS
      ```

  - [ ] Append a run log entry to `REPO.md` under `## Run Log`: date, findings count, cards created.

  - [ ] If no new findings, note under `## HUMAN` and stop.

  ## HUMAN

  #### COMMENTS
  ```

- [ ] Commit: `git add .flowdeck/.gitdeck/repos/{{SLUG}} && git commit -m "deck: add repo watch — {{OWNER}}/{{REPO}}"`.

## HUMAN

- [ ] GitHub repo (owner/repo):
  > _answer:_

- [ ] Category (owned / competitor / provider / consumer / benchmark):
  > _answer:_

- [ ] Watch types (releases, issues, prs — comma-separated; default: releases):
  > _answer:_

- [ ] Watch config (what signals matter from this repo?):
  > _answer:_

- [ ] Slug (kebab-case folder name, e.g. `acme-my-lib`):
  > _answer:_

#### COMMENTS
