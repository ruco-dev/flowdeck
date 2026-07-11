---
lifecycle: ritual
recurrence: on-demand
---

# creamdeck-init

> **Sleeve resident.** This is a ritual card: it lives in the deck's own `_sleeve/` (`.flowdeck/.creamdeck/_sleeve/`), is played in place, and is never melded. Replaying it **is** `flowdeck install creamdeck --repair` — every step is create-if-missing, so a re-play converges the working tree without clobbering local tuning.

## BOT

- [ ] Read `FLOWDECK.md` for project name and description. Fall back to `package.json` name/description if not found.

- [ ] **Migrate for the rename campaigns** — apply whichever renames are applicable. For each pair below, if the old path exists and the new one does not, rename it with `git mv <old> <new>` (plain `mv` if untracked). If **both** exist, do not merge — surface the conflict under `## HUMAN` and leave both untouched. If only the new name exists (or neither), skip silently — replay stays idempotent:
  - **ADR-0005/06 reversal** (instrument folders — `_`-prefix → plain, creamdeck 0.6.0):
    - `.flowdeck/.creamdeck/creamdeck-inbox/` → `.flowdeck/.creamdeck/creamdeck-inbox/`
    - `.flowdeck/.creamdeck/tickets/` → `.flowdeck/.creamdeck/tickets/`
  - **Pre-0.5.0 legacy** (storage folders — plain → `_`-prefix):
    - `.flowdeck/.creamdeck/contacts/` → `.flowdeck/.creamdeck/_contacts/`
    - `.flowdeck/.creamdeck/scripts/` → `.flowdeck/.creamdeck/_scripts/`
    - `.flowdeck/.creamdeck/report/` → `.flowdeck/.creamdeck/_report/`
  - `.flowdeck/_sleeve/creamdeck-init/` → `.flowdeck/.creamdeck/_sleeve/creamdeck-init/` (sleeve cards moved from the board's root `_sleeve/` into each deck's own — `flowdeck update creamdeck` also performs this relocation itself)
  After any move, update literal old-path references inside the migrated instance's own files (instrument `TODO.md`s, config/index docs) to match the target paths; the instance's `AGENT.md` copies are refreshed from the deck package by `flowdeck update creamdeck` itself.

- [ ] This ritual is idempotent — do not stop early if `.flowdeck/.creamdeck/` already exists. For each path below, create it only if missing; skip silently if it already exists:
  - `.flowdeck/.creamdeck/`
  - `.flowdeck/.creamdeck/creamdeck-inbox/`
  - `.flowdeck/.creamdeck/_contacts/`
  - `.flowdeck/.creamdeck/tickets/`

- [ ] Install the report scripts into `.flowdeck/.creamdeck/_scripts/`. Create the directory, then copy `report.js` and `html.js` into it from `.flowdeck/_scripts/creamdeck/` (populated by `flowdeck install creamdeck` per the manifest `scripts` array). If the scripts are absent, note under `## HUMAN` that the scripts must be installed first (`flowdeck install creamdeck` or `flowdeck update creamdeck`) and the `generate-report` / `export-report` actions will not run until they are.

- [ ] Add `.*` to `.flowdeck/.flowdeckignore` if not already present, so `.creamdeck/` is excluded from `flowdeck turn`.

- [ ] Scaffold `.flowdeck/.creamdeck/README.md` if it does not already exist:
  ```
  # creamdeck

  Project-scoped CRM for {{PROJECT_NAME}}. Tracks contacts and incoming communications
  (emails, calls) relevant to this project.

  ## Structure

  - `creamdeck-inbox/` — incoming items routed from emaildeck or logged manually
  - `_contacts/` — one subfolder per tracked contact
  - `tickets/` — open support or project tickets

  ## Usage

  - Play `creamdeck-inbox/TODO.md` to surface and route unread items.
  - Play a contact card to review interactions and draft follow-ups.
  - Play `tickets/TODO.md` to see open tickets by stage.
  - Add a contact directly: `flowdeck blueprint use creamdeck-add-contact`.
  - Open a ticket: `flowdeck blueprint use creamdeck-open-ticket`.
  ```

- [ ] Create `.flowdeck/.creamdeck/creamdeck-inbox/TODO.md` if it does not already exist:
  ```markdown
  ---
  lifecycle: recurring
  recurrence: on-demand
  ---

  # creamdeck-inbox

  ## BOT

  - [ ] List all subdirectories in this folder. For each, read `INBOX-ITEM.md` and check `TODO.md` for any completed routing action (`create-contact`, `log-to-contact`, `route-to-crunchdeck`, `archive`).
  - [ ] Surface unrouted items under `## HUMAN`: subject, type (email/call), date, contact name, and a one-sentence summary.

  ## HUMAN

  ## ACTIONS

  <!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

  - [ ] create-inbox-item — manually log a call or note: ask for subject, type, contact, date, and notes; scaffold `creamdeck-inbox/<YYYY-MM-DD>-<slug>/INBOX-ITEM.md` from `_energy-cards/INBOX-ITEM.md.template` and a `TODO.md` with the standard ACTIONS menu

  #### COMMENTS
  ```

- [ ] Scaffold `.flowdeck/.creamdeck/CREAMDECK.md` if it does not already exist — from `_energy-cards/CREAMDECK.md.template`, substituting `{{PROJECT_NAME}}`, `{{PROJECT_DESCRIPTION}}`, and `{{TICKET_PREFIX}}`. Derive `TICKET_PREFIX` from the project name: uppercase first 3 consonants or first 3 letters if unclear (e.g. `xyz-app` → `XYZ`, `mdblu` → `MDB`). Ask under `## HUMAN` if ambiguous.

- [ ] Scaffold an example contact at `.flowdeck/.creamdeck/_contacts/john-dee/` if it does not already exist:

  **`CONTACT.md`** (copy verbatim, substitute `{{DATE}}` with today):
  ```markdown
  # John Dee

  | Field | Value |
  |-------|-------|
  | Company | Alchemy Labs |
  | Role | CTO |
  | Email | john.dee@alchemy-labs.example |
  | Phone | — |
  | Added | {{DATE}} |

  ## Context

  Example contact — replace or delete. Met via a GitHub issue; evaluating this project
  for internal use. Main interest: CLI scaffolding and template customisation.

  ## Interaction Log

  <!-- most recent first — format: **YYYY-MM-DD** · type (email/call/note) · summary -->

  **{{DATE}}** · email · Introduced himself, asked about custom template support and
  private registry hosting. Stack: TypeScript, Prisma, tRPC.

  ## Follow-up

  <!-- dated next actions — format: **YYYY-MM-DD** · description -->

  ## Notes

  Potential design partner. Delete this file and replace with real contacts.
  ```

  **`TODO.md`**:
  ```markdown
  # John Dee

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

- [ ] Scaffold an example inbox item at `.flowdeck/.creamdeck/creamdeck-inbox/{{DATE}}-example-intro/` if it does not already exist:

  **`INBOX-ITEM.md`** (substitute `{{DATE}}` with today):
  ```markdown
  # Evaluating this project for internal use

  | Field | Value |
  |-------|-------|
  | Type | email |
  | Source | email:thread-example |
  | Contact | John Dee |
  | Date | {{DATE}} |
  | Status | unrouted |

  ## Summary

  Example inbox item — replace or delete. John Dee (CTO, Alchemy Labs) reached out
  after finding this project online. Two questions: (1) custom template support,
  (2) private registry hosting for the CLI.

  ## Raw

  > Hi,
  >
  > I came across your project while researching AI workflow tooling. We're a ~12-person
  > product team using Claude for most of our planning and handoff docs, and your template
  > set looks very close to what we've been building ad-hoc.
  >
  > Two questions: can we add our own templates without forking? And is there a way to
  > point the CLI at a private registry?
  >
  > Happy to jump on a call if that's easier.
  >
  > John Dee, CTO — Alchemy Labs
  ```

  **`TODO.md`**:
  ```markdown
  # Evaluating this project for internal use

  ## BOT

  - [ ] Read `INBOX-ITEM.md` — extract subject, source, contact, date, and summary.
  - [ ] Surface the item summary under `## HUMAN` with suggested next actions.

  ## HUMAN

  ## ACTIONS

  <!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

  - [ ] draft-reply — create a Gmail draft in emaildeck responding to this thread
  - [ ] create-contact — scaffold `_contacts/<name>/TODO.md` from this item's context
  - [ ] log-to-contact — append this interaction to an existing `_contacts/<name>/CONTACT.md`
  - [ ] route-to-crunchdeck — copy this item to `.crunchdeck/crunchdeck-inbox/` as a signal card
  - [ ] schedule-follow-up — add a follow-up task with a target date to the linked contact card
  - [ ] archive — mark this item as resolved; move `completed: true` to `INBOX-ITEM.md`

  #### COMMENTS
  ```

- [ ] Scaffold `.flowdeck/.creamdeck/tickets/PIPELINE.md` if it does not already exist — from `_energy-cards/PIPELINE.md.template`, substituting `{{PROJECT_NAME}}`.

- [ ] Create `.flowdeck/.creamdeck/tickets/TODO.md` if it does not already exist:
  ```markdown
  ---
  lifecycle: recurring
  recurrence: on-demand
  ---

  # tickets

  ## BOT

  - [ ] List all subdirectories in this folder. For each, read `TICKET.md` — extract title, ID, status, stage, priority, and linked contact.
  - [ ] Surface open tickets (Stage ≠ Closed) under `## HUMAN`, grouped by stage, sorted by priority (high first).
  - [ ] Flag any tickets in `Waiting` stage where the last update in `TICKET.md` is older than 7 days.
  - [ ] Scan emaildeck inbox — for each email, infer tasks and their current status implied by the client's message. For each task found: open a ticket using the `open-ticket` action (auto-generating ID, linking to the contact, setting stage and priority from the inferred status); then update the ticket status field to reflect the inferred state (e.g. New, In Progress, Waiting, Blocked).

  ## HUMAN

  ## ACTIONS

  <!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

  - [ ] open-ticket — scaffold a new ticket card from `_energy-cards/TICKET.md.template`; ask for title, priority (high/medium/low), stage (default: New), linked contact slug, and description. Auto-generate the ticket ID: read `Prefix` from the `## Ticket ID` table in `CREAMDECK.md`, count existing ticket subdirs for the sequence (zero-padded to 3 digits), and combine as `{PREFIX}{DDMMYYYY}{SEQ}` using today's date (e.g. `XYZ29062026001`). Use this ID as the folder name and as `{{TICKET_ID}}` in the scaffolded `TICKET.md`. If opened from an emaildeck email, record the source message path and write the new ticket ID back into that message's `EMAIL.md` `| Ticket |` field.
  - [ ] close-ticket — prompt for ticket slug; set Stage to Closed and fill Closed date in `TICKET.md`
  - [ ] generate-report — rebuild `tickets/REPORT.md` from live ticket data without bot intervention; run `node .flowdeck/.creamdeck/_scripts/report.js` from the project root
  - [ ] export-report — generate a static HTML report from live ticket data; run `node .flowdeck/.creamdeck/_scripts/html.js` from the project root; output: `.flowdeck/.creamdeck/_report/` (existing user assets in `_report/` are preserved)
  - [ ] export-report --lang <code> — translated HTML copy; the agent reads each `TICKET.md`, translates title/description/updates/resolution into the target language, writes the result to `.flowdeck/.creamdeck/_report/<code>/.translations.json` (per ticket ID → `{ title, description, updates, resolution }`), then runs `node .flowdeck/.creamdeck/_scripts/html.js --lang <code>` to render the localized tree under `_report/<code>/`

  #### COMMENTS
  ```

- [ ] Check if `.flowdeck/.emaildeck/` exists. If it does, surface under `## HUMAN`:
  ```
  emaildeck is installed. To route contact-related emails to creamdeck, add
  `send-to-creamdeck` to the default tasks of any relevant emaildeck filter card.
  ```

- [ ] Commit **only if this replay changed anything** (a repair replay on an already-scaffolded project produces no diff): `git add .flowdeck/.creamdeck && git diff --cached --quiet || git commit -m "deck: init creamdeck"`.

## HUMAN

#### COMMENTS
