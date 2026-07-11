---
lifecycle: one-shot
---

# webdeck-add-query
<!-- lifecycle: one-shot -->

## BOT

- [ ] Check if `.flowdeck/.webdeck/` exists. If not, stop and note under `## HUMAN` to run `webdeck-init` first.

- [ ] Read `## HUMAN` below for query name, intent, search terms, and slug. Stop and surface any missing required values under `## HUMAN`.

- [ ] Create `.flowdeck/.webdeck/queries/{{SLUG}}/` and `findings/` inside it.

- [ ] Scaffold `QUERY.md` from `_energy-cards/QUERY.md.template` — substitute `{{QUERY_NAME}}`, `{{INTENT}}`, `{{CATEGORY}}`, and `{{TERMS}}`.

- [ ] Create `TODO.md` in `.flowdeck/.webdeck/queries/{{SLUG}}/`:

  ```markdown
  # {{QUERY_NAME}}

  ## BOT

  - [ ] Read `QUERY.md` for search terms and intent.

  - [ ] Check if `.flowdeck/.crunchdeck/profile/PROFILE.md` exists and read it for relevance context.

  - [ ] Run 2–3 searches using the terms from `QUERY.md`. Focus on: new competitor features, community discussions (HN, Reddit), analyst takes, trend signals.

  - [ ] For each meaningful result not already in `findings/`, assess relevance against PROFILE.md context if available. Discard noise.

  - [ ] For each qualifying result, create `findings/<YYYY-MM-DD>-<slug>/`:
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

  - [ ] Append a run log entry to `QUERY.md` under `## Run Log`: date, results scanned, cards created.

  - [ ] If no qualifying results, note under `## HUMAN` and stop.

  ## HUMAN

  #### COMMENTS
  ```

- [ ] Commit: `git add .flowdeck/.webdeck/queries/{{SLUG}} && git commit -m "deck: add web query — {{QUERY_NAME}}"`.

## HUMAN

- [ ] Query name (human-readable):
  > _answer:_

- [ ] Intent (category / competitor / user-pain / trends):
  > _answer:_

- [ ] Search terms (one per line or comma-separated):
  > _answer:_

- [ ] Slug (kebab-case folder name):
  > _answer:_

#### COMMENTS
