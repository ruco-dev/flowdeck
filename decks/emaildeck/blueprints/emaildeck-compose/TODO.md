---
lifecycle: one-shot
---

# emaildeck-compose
<!-- lifecycle: one-shot -->

## BOT

- [ ] Check if `.flowdeck/.emaildeck/` exists. If not, stop and note under `## HUMAN` to run `emaildeck-init` first.

- [ ] Read `## HUMAN` below for slug, To, Cc, Bcc, Subject, and Body. Subject and To are required — stop and surface any missing required values under `## HUMAN`. Cc/Bcc may be left blank.

- [ ] Create `.flowdeck/.emaildeck/local_drafts/{{SLUG}}/`.

- [ ] Scaffold `MESSAGE.md` from `_energy-cards/MESSAGE.md.template` — substitute `{{TO}}`, `{{CC}}`, `{{BCC}}`, `{{SUBJECT}}`, `{{BODY}}`. Leave the `Gmail draft ID` row empty.

- [ ] Create `TODO.md` in `.flowdeck/.emaildeck/local_drafts/{{SLUG}}/`:

  ```markdown
  # {{SUBJECT}}

  ## BOT

  ## HUMAN

  Author / edit the message in `MESSAGE.md`. When ready, move `push-to-gmail` into `## BOT` to create the Gmail draft.

  ## ACTIONS

  <!-- Move an item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

  - [ ] improve-language — [target tone, e.g. "more concise" or "formal"]
  - [ ] push-to-gmail

  #### COMMENTS
  ```

- [ ] Commit: `git add .flowdeck/.emaildeck/local_drafts/{{SLUG}} && git commit -m "deck: compose email draft — {{SLUG}}"`.

## HUMAN

- [ ] Draft slug (kebab-case, used as folder name):
  > _answer:_

- [ ] To (recipient address):
  > _answer:_

- [ ] Cc:
  > _answer:_ (optional)

- [ ] Bcc:
  > _answer:_ (optional)

- [ ] Subject:
  > _answer:_

- [ ] Body:
  > _answer:_

#### COMMENTS
