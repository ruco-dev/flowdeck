---
lifecycle: one-shot
---

# crunchdeck-adr
<!-- lifecycle: one-shot -->

## BOT

- [ ] Read `.flowdeck/.crunchdeck/_decisions/` to find the highest-numbered ADR. If none exist, start at `0001`.

- [ ] Create `.flowdeck/.crunchdeck/_decisions/ADR-<number>/ADR-<number>.md` from `_energy-cards/ADR.md.template` — substitute `{{PROJECT_NAME}}` from the human-provided title, `{{DATE}}` today, `{{AUTHOR}}` from `git config user.name`.

- [ ] Create `.flowdeck/.crunchdeck/_decisions/ADR-<number>/TODO.md`:
  ```
  # ADR-<number>

  ## BOT

  - [ ] Read `ADR-<number>.md` and fill in any incomplete sections using the decision context from `## HUMAN`.
  - [ ] If the decision affects PROFILE, BACKLOG, or ROADMAP, note the impact under `## HUMAN`.

  ## HUMAN

  #### COMMENTS
  ```

- [ ] Commit: `git add .flowdeck/.crunchdeck/_decisions/ && git commit -m "deck: adr <number> — <title>"`.

## HUMAN

- [ ] What decision needs to be recorded? Describe the context and options considered.
  > _answer:_

#### COMMENTS
