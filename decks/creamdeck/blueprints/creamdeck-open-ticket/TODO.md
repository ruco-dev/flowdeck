---
lifecycle: one-shot
---

# creamdeck-open-ticket
<!-- lifecycle: one-shot -->

## BOT

- [ ] Check `.flowdeck/.creamdeck/` exists. If not, stop and surface under `## HUMAN` to run `creamdeck-init` first.

- [ ] Check `.flowdeck/.creamdeck/tickets/` exists. If not, create it, scaffold `PIPELINE.md` from `_energy-cards/PIPELINE.md.template` (substitute `{{PROJECT_NAME}}` from `FLOWDECK.md` or `package.json`), and create `tickets/TODO.md` as the tickets overview card:

  ```markdown
  # tickets

  ## BOT

  - [ ] List all subdirectories in this folder. For each, read `TICKET.md` — extract title, ID, status, stage, priority, and linked contact.
  - [ ] Surface open tickets (Stage ≠ Closed) under `## HUMAN`, grouped by stage, sorted by priority (high first).
  - [ ] Flag any tickets in `Waiting` stage where the last update in `TICKET.md` is older than 7 days.

  ## HUMAN

  ## ACTIONS

  <!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

  - [ ] open-ticket — scaffold a new ticket card from `_energy-cards/TICKET.md.template`; ask for title, priority (high/medium/low), stage (default: New), linked contact slug, and description. Auto-generate the ticket ID: read `Prefix` from the `## Document IDs` table in `CREAMDECK.md`, count existing ticket subdirs for the sequence (zero-padded to 3 digits), and combine as `{PREFIX}{DDMMYYYY}{SEQ}` using today's date (e.g. `XYZ29062026001`). Use this ID as the folder name and as `{{TICKET_ID}}` in the scaffolded `TICKET.md`. If opened from an emaildeck email, record the source message path and write the new ticket ID back into that message's `EMAIL.md` `| Ticket |` field.
  - [ ] close-ticket — prompt for ticket slug; set Stage to Closed and fill Closed date in `TICKET.md`

  #### COMMENTS
  ```

- [ ] Read `## HUMAN` below for title, priority, linked contact, and description. Stop and surface any missing required values (title) under `## HUMAN`.

- [ ] Generate a ticket ID: read `Prefix` from the `## Document IDs` table in `CREAMDECK.md`. Count existing subdirectories in `tickets/` (excluding non-ticket files) + 1, zero-padded to 3 digits. Combine as `{PREFIX}{DDMMYYYY}{SEQ}` using today's date (e.g. `XYZ29062026001`). This ID is passed to the client and must be unique.

- [ ] Generate slug from title: kebab-case, max 40 characters.

- [ ] Create `.flowdeck/.creamdeck/tickets/{{DATE}}-{{SLUG}}/`.

- [ ] Scaffold `TICKET.md` from `_energy-cards/TICKET.md.template` — substitute `{{TICKET_TITLE}}`, `{{TICKET_ID}}`, `{{PRIORITY}}`, `{{STAGE}}` (default: New), `{{CONTACT}}`, `{{DATE}}` (today), `{{DESCRIPTION}}`, `{{SOURCE_EMAIL}}` (the provided source message path, or `—` when no source was given).

- [ ] Create `TODO.md` in `.flowdeck/.creamdeck/tickets/{{DATE}}-{{SLUG}}/`:

  ```markdown
  # {{TICKET_TITLE}}

  ## BOT

  - [ ] Read `TICKET.md` — extract title, stage, priority, linked contact, and last update.
  - [ ] Surface ticket summary and flag if `Waiting` with no update in 7+ days under `## HUMAN`.

  ## HUMAN

  ## ACTIONS

  <!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

  - [ ] advance-stage — move to next pipeline stage; update Stage in `TICKET.md`
  - [ ] log-update — append an entry to the Updates section of `TICKET.md` (date + summary)
  - [ ] link-inbox-item — note an inbox item linked to this ticket in both files
  - [ ] draft-reply — create a Gmail draft via emaildeck to the linked contact
  - [ ] add-meeting — schedule a meeting for this ticket in calendardeck (see creamdeck AGENT.md)
  - [ ] link-proposal-item — prompt for a proposal ID and item number; verify the item's Hash in that `PROPOSAL.md` is minted (run `mark-approved` on the proposal first if not); write `<proposal-id>#<item-number> · <hash>` into this ticket's `Billing Ref` field
  - [ ] close — mark ticket Resolved or Closed; populate Resolution in `TICKET.md`

  #### COMMENTS
  ```

- [ ] If a source emaildeck message was provided: resolve its `EMAIL.md` — use the given relative path directly, or search `.flowdeck/.emaildeck/mail-inbox/<YYYY-MM-DD>-<slug>/EMAIL.md` for a card whose `Thread ID` field matches. Set that file's `| Ticket |` field value to `[{{TICKET_ID}}]({{relative path from the EMAIL.md to the new ticket folder}})`. If no source was provided, skip silently; if a source was provided but the `EMAIL.md` cannot be found, surface the unresolved reference under `## HUMAN`.

- [ ] Commit: `git add .flowdeck/.creamdeck/tickets .flowdeck/.emaildeck && git commit -m "deck: open ticket — {{TICKET_TITLE}}"`.

## HUMAN

- [ ] Title:
  > _answer:_

- [ ] Priority (high / medium / low):
  > _answer:_ (default: medium)

- [ ] Linked contact slug (from `_contacts/`):
  > _answer:_ (optional)

- [ ] Source emaildeck message (relative path to its EMAIL.md, or thread ID):
  > _answer:_ (optional)

- [ ] Description:
  > _answer:_

#### COMMENTS
