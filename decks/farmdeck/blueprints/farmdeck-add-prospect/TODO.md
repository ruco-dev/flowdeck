---
lifecycle: one-shot
---

# farmdeck-add-prospect
<!-- lifecycle: one-shot -->

## BOT

- [ ] Check if `.flowdeck/.farmdeck/` exists. If not, stop and note under `## HUMAN` to run `farmdeck-init` first.

- [ ] Read `## HUMAN` below for slug, name, email, company, role, source, and notes. Slug and name are required — stop and surface any missing required values under `## HUMAN`.

- [ ] Check if `.flowdeck/.farmdeck/prospects/{{SLUG}}/` already exists. If it does, stop and note under `## HUMAN` that this slug is taken.

- [ ] Create `.flowdeck/.farmdeck/prospects/{{SLUG}}/`.

- [ ] Write `PROSPECT.md` from `_energy-cards/PROSPECT.md.template` — substitute all fields. Set `Stage` to `Seed` and `Added` to today's date.

- [ ] Write `INTERACTIONS.md` from `_energy-cards/INTERACTIONS.md.template` — leave the log empty.

- [ ] Scaffold `TODO.md`:
  ```markdown
  # {{NAME}}

  {{COMPANY}} · {{ROLE}} · {{EMAIL}}

  ## BOT

  ## HUMAN

  ## ACTIONS

  <!-- Move an item to ## BOT to activate it, then play this card. -->

  - [ ] log-interaction — [type: call/email/meeting | notes]
  - [ ] advance-stage — promote to next stage
  - [ ] drop — move to dropped/ and mark as Dropped
  - [ ] win — move to won/ and mark as Won
  - [ ] draft-email — compose a Gmail draft to this prospect via emaildeck
  - [ ] send-to-crunchdeck — [signal or insight to route to product backlog]
  ```

- [ ] Commit: `git add .flowdeck/.farmdeck/prospects/{{SLUG}} && git commit -m "deck: add prospect — {{NAME}}"`.

## HUMAN

- [ ] Slug (kebab-case):
  > _answer:_

- [ ] Name:
  > _answer:_

- [ ] Email:
  > _answer:_ (optional)

- [ ] Company:
  > _answer:_ (optional)

- [ ] Role / title:
  > _answer:_ (optional)

- [ ] Source (how they were found — e.g. `linkedin`, `referral`, `inbound`):
  > _answer:_ (optional)

- [ ] Notes:
  > _answer:_ (optional)
