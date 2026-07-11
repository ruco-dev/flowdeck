---
lifecycle: one-shot
---

# creamdeck-add-contact
<!-- lifecycle: one-shot -->

## BOT

- [ ] Check if `.flowdeck/.creamdeck/` exists. If not, stop and surface under `## HUMAN` to run `creamdeck-init` first.

- [ ] Read `## HUMAN` below for contact name, slug, company, role, email, phone, and context. Stop and surface any missing required values (name, slug) under `## HUMAN`.

- [ ] Create `.flowdeck/.creamdeck/_contacts/{{CONTACT_SLUG}}/`.

- [ ] Scaffold `CONTACT.md` from `_energy-cards/CONTACT.md.template` — substitute `{{CONTACT_NAME}}`, `{{COMPANY}}`, `{{ROLE}}`, `{{EMAIL}}`, `{{PHONE}}`, `{{DATE}}` (today), `{{CONTEXT}}`.

- [ ] Create `TODO.md` in `.flowdeck/.creamdeck/_contacts/{{CONTACT_SLUG}}/`:

  ```markdown
  # {{CONTACT_NAME}}

  ## BOT

  - [ ] Read `CONTACT.md` — extract name, company, role, last interaction date, and any open follow-ups.
  - [ ] Surface a contact summary and any overdue follow-ups under `## HUMAN`.

  ## HUMAN

  ## ACTIONS

  <!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

  - [ ] draft-email — create a Gmail draft to this contact via emaildeck
  - [ ] log-interaction — append a new entry to `CONTACT.md` interaction log (date, type, notes)
  - [ ] schedule-follow-up — add a follow-up entry with a target date to `CONTACT.md`
  - [ ] route-to-crunchdeck — surface this contact's context as a signal in `.crunchdeck/crunchdeck-inbox/`
  - [ ] sync-from-inbox — scan `../../creamdeck-inbox/` for unlogged items linked to this contact; append missing interactions to `CONTACT.md`

  #### COMMENTS
  ```

- [ ] Commit: `git add .flowdeck/.creamdeck/_contacts/{{CONTACT_SLUG}} && git commit -m "deck: add contact — {{CONTACT_NAME}}"`.

## HUMAN

- [ ] Contact name (human-readable):
  > _answer:_

- [ ] Contact slug (kebab-case, used as folder name):
  > _answer:_

- [ ] Company:
  > _answer:_ (optional)

- [ ] Role / title:
  > _answer:_ (optional)

- [ ] Email:
  > _answer:_ (optional)

- [ ] Phone:
  > _answer:_ (optional)

- [ ] Context (how you know them, what you're working on together):
  > _answer:_ (optional)

#### COMMENTS
