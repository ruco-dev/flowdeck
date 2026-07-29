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
  - `.flowdeck/.creamdeck/billed-tickets/`
  - `.flowdeck/.creamdeck/closed-tickets/`
  - `.flowdeck/.creamdeck/proposals/`
  - `.flowdeck/.creamdeck/request-notes/`
  - `.flowdeck/.creamdeck/invoices/`

- [ ] Confirm the report and billing scripts are present at `.flowdeck/.creamdeck/_scripts/report.js`, `html.js`, `approve-proposal.js`, `export-invoice.js`, `invoice-from-tickets.js`, `client-report.js`, and `financial-export.js` (installed there directly by `flowdeck install creamdeck` / `flowdeck update creamdeck`, since `installRoot` routes `manifest.scripts` straight into the deck's own `_scripts/` — no separate staging copy). If any are absent, note under `## HUMAN` that the scripts must be installed first (`flowdeck install creamdeck` or `flowdeck update creamdeck`) and the `generate-report` / `export-report` / `mark-approved` / `mark-issued` / `client-report` / `financial-export` actions will not run until they are.

- [ ] Add `.*` to `.flowdeck/.flowdeckignore` if not already present, so `.creamdeck/` is excluded from `flowdeck turn`.

- [ ] Scaffold `.flowdeck/.creamdeck/README.md` from `_energy-cards/README.md.template`, substituting `{{PROJECT_NAME}}` (read `FLOWDECK.md` for the project name, falling back to `package.json`'s `name`). Repair-safe: create it if missing; if it exists, regenerate it from the current template and refresh the stamp — unless a `.flowdeck/.creamdeck/.readme-hash` stamp already exists and no longer matches the file's current content (real evidence of a hand-edit since the last generation; a *missing* stamp is not such evidence and must not block regeneration). In that hand-edited case, leave it alone and note under `## HUMAN` that it's locally customized and may be out of sync. Write/refresh `.flowdeck/.creamdeck/.readme-hash` (sha256 of the file) after writing or confirming it.

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

- [ ] Scaffold `.flowdeck/.creamdeck/ACTIONS.md` if it does not already exist — copy `ACTIONS.md` from the deck package verbatim (the action reference catalog; `flowdeck update creamdeck` refreshes it). If it exists, leave it unless it is unmodified from the package, in which case refresh it.

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

  - [ ] open-ticket — scaffold a new ticket card from `_energy-cards/TICKET.md.template`; ask for title, priority (high/medium/low), stage (default: New), linked contact slug, and description. Auto-generate the ticket ID: read `Prefix` from the `## Document IDs` table in `CREAMDECK.md`, count existing ticket subdirs for the sequence (zero-padded to 3 digits), and combine as `{PREFIX}{DDMMYYYY}{SEQ}` using today's date (e.g. `XYZ29062026001`). Use this ID as the folder name and as `{{TICKET_ID}}` in the scaffolded `TICKET.md`. If opened from an emaildeck email, record the source message path and write the new ticket ID back into that message's `EMAIL.md` `| Ticket |` field.
  - [ ] close-ticket — prompt for ticket slug; set Stage in `TICKET.md` to Resolved or Closed as directed. If **Resolved**: fill the Resolution section, ticket stays in `tickets/`. If **Closed**: fill the Closed date, then move `tickets/<id>/` to `closed-tickets/<id>/` (git mv if tracked, plain mv otherwise; check `.flowdeck/.creamdeck/closed-tickets/` exists first — it's pre-created by init, but scaffold `closed-tickets/TODO.md` too if somehow missing, same shape as this card's own scaffold below).
  - [ ] generate-report — rebuild `tickets/REPORT.md` from live ticket data without bot intervention; run `node .flowdeck/.creamdeck/_scripts/report.js` from the project root (scans both `tickets/` and `closed-tickets/`)
  - [ ] export-report — generate a static HTML report from live ticket data; run `node .flowdeck/.creamdeck/_scripts/html.js` from the project root; output: `.flowdeck/.creamdeck/_report/` (existing user assets in `_report/` are preserved; scans both `tickets/` and `closed-tickets/`)
  - [ ] export-report --lang <code> — translated HTML copy; the agent reads each `TICKET.md`, translates title/description/updates/resolution into the target language, writes the result to `.flowdeck/.creamdeck/_report/<code>/.translations.json` (per ticket ID → `{ title, description, updates, resolution }`), then runs `node .flowdeck/.creamdeck/_scripts/html.js --lang <code>` to render the localized tree under `_report/<code>/`

  #### COMMENTS
  ```

- [ ] Create `.flowdeck/.creamdeck/closed-tickets/TODO.md` if it does not already exist:
  ```markdown
  ---
  lifecycle: recurring
  recurrence: on-demand
  ---

  # closed-tickets

  ## BOT

  - [ ] List all subdirectories in this folder. For each, read `TICKET.md` — extract title, ID, priority, contact, and Closed date.
  - [ ] Surface closed tickets under `## HUMAN`, grouped by month closed, most recent first.

  ## HUMAN

  ## ACTIONS

  <!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

  - [ ] reopen — prompt for a ticket ID or folder; move it from `closed-tickets/<id>/` back to `tickets/<id>/`, set Stage to Open, and clear the Closed date in `TICKET.md`

  #### COMMENTS
  ```

- [ ] Create `.flowdeck/.creamdeck/billed-tickets/TODO.md` if it does not already exist:
  ```markdown
  ---
  lifecycle: recurring
  recurrence: on-demand
  ---

  # billed-tickets

  Tickets that have been invoiced and are **waiting for payment**. A ticket lands here
  when `create-invoice-from-tickets` (see `../ACTIONS.md`) bills it: its `TICKET.md`
  carries an `Invoice` field naming the invoice it was billed on. It leaves here when
  that invoice is paid (`settle-tickets` → `closed-tickets/`) or voided (`unbill` →
  back to `tickets/`).

  ## BOT

  - [ ] List all subdirectories in this folder. For each, read `TICKET.md` — extract title, ID, `Invoice`, `Hours Real` (or its billing fields), and contact.
  - [ ] Group them by `Invoice` under `## HUMAN`; for each invoice read `../invoices/<id>/INVOICE.md` and show its Status, Date, Due Date and total.
  - [ ] Flag any invoice whose Status is `Issued` and whose Due Date has passed — those tickets are waiting on an overdue invoice.

  ## HUMAN

  ## ACTIONS

  <!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

  - [ ] settle-tickets — prompt for an invoice ID (default: every invoice whose Status is `Paid`); for each ticket here carrying that `Invoice`, set Stage to `Closed` and fill `Closed` with the invoice's `Paid` date in `TICKET.md`, then move `billed-tickets/<slug>/` to `closed-tickets/<slug>/` (git mv if tracked, plain mv otherwise)
  - [ ] unbill — prompt for an invoice ID or ticket slug; move each matching ticket back to `tickets/<slug>/`, clear its `Invoice` field (set to `—`) and append `**{{DATE}}** · Unbilled from <invoice-id>` to its `## Updates`. Use after a `void` — the ticket becomes billable again on the next `create-invoice-from-tickets` run
  - [ ] reopen — prompt for a ticket ID or folder; move it back to `tickets/<id>/` and set Stage to Open. Same as `closed-tickets/`'s `reopen`, but leaves the `Invoice` field intact — the work was already billed

  #### COMMENTS
  ```

- [ ] Scaffold `.flowdeck/.creamdeck/proposals/PIPELINE.md` if it does not already exist — from `_energy-cards/PROPOSAL-PIPELINE.md.template`, substituting `{{PROJECT_NAME}}`.

- [ ] Create `.flowdeck/.creamdeck/proposals/TODO.md` if it does not already exist:
  ```markdown
  # proposals

  ## BOT

  - [ ] List all subdirectories in this folder. For each, read `PROPOSAL.md` — extract title, ID, status, contact, and total value (sum of the Items table's Total column).
  - [ ] Surface proposals under `## HUMAN`, grouped by status (Draft, Sent, Approved, Rejected, Expired).

  ## HUMAN

  ## ACTIONS

  <!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

  - [ ] new-proposal — scaffold a new proposal card from `_energy-cards/PROPOSAL.md.template`; ask for title, linked contact slug, currency, valid-until date, and a line-item list (`description | qty | unit price` per line). Auto-generate the proposal ID: read `Prefix` from the `## Document IDs` table in `CREAMDECK.md`, count existing proposal subdirs for the sequence (zero-padded to 3 digits), and combine as `{PREFIX}P{DDMMYYYY}{SEQ}` using today's date (e.g. `XYZP29062026001`). Compute each item's Total as qty × unit price; leave every Hash cell `—`.
  - [ ] mark-approved — prompt for a proposal ID or folder name; run `node .flowdeck/.creamdeck/_scripts/approve-proposal.js <id-or-folder>` from the project root to mint item hashes and set Status to Approved
  - [ ] client-report — prompt for a proposal ID or folder; run `node .flowdeck/.creamdeck/_scripts/client-report.js <id-or-folder> [--lang <code>]` from the project root to render a client-safe `client-report.html` (never reads Hash / Notes / Updates). Then add under `## HUMAN`: review `client-report.html` and confirm no internal detail before sending. See `ACTIONS.md`.
  - [ ] draft-email — compose a cover email from this proposal into `<folder>/email-draft/EMAIL.md` (from `_energy-cards/EMAIL-DRAFT.md.template`), attaching `client-report.html`, never the raw `PROPOSAL.md`. Then add under `## HUMAN`: review `email-draft/EMAIL.md` and send (or hand to emaildeck). Draft-not-send. See `ACTIONS.md`.

  #### COMMENTS
  ```

- [ ] Scaffold `.flowdeck/.creamdeck/request-notes/PIPELINE.md` if it does not already exist — from `_energy-cards/REQUEST-NOTE-PIPELINE.md.template`, substituting `{{PROJECT_NAME}}`.

- [ ] Create `.flowdeck/.creamdeck/request-notes/TODO.md` if it does not already exist:
  ```markdown
  # request-notes

  ## BOT

  - [ ] List all subdirectories in this folder. For each, read `REQUEST-NOTE.md` — extract title, ID, status, proposal reference, and whether a Source PDF is attached.
  - [ ] Surface request notes under `## HUMAN`, grouped by status (Draft, Sent, Confirmed), flagging any still missing a Source PDF.

  ## HUMAN

  ## ACTIONS

  <!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

  - [ ] attach-pdf — prompt for a request note ID or folder and a PDF path; copy the file into `request-notes/<id>/attachments/` and record its relative path in the `Source PDF` field
  - [ ] mark-confirmed — prompt for a request note ID or folder; set Status to Confirmed in `REQUEST-NOTE.md`
  - [ ] client-report — prompt for a request note ID or folder; run `node .flowdeck/.creamdeck/_scripts/client-report.js <id-or-folder> [--lang <code>]` from the project root to render a client-safe `client-report.html` (never reads Hash / Notes / Updates). Then add under `## HUMAN`: review `client-report.html` and confirm no internal detail before sending. See `ACTIONS.md`.
  - [ ] draft-email — compose a cover email from this request note into `<folder>/email-draft/EMAIL.md`, attaching `client-report.html`, never the raw `REQUEST-NOTE.md`. Then add under `## HUMAN`: review `email-draft/EMAIL.md` and send (or hand to emaildeck). Draft-not-send. See `ACTIONS.md`.

  #### COMMENTS
  ```

- [ ] Scaffold `.flowdeck/.creamdeck/invoices/PIPELINE.md` if it does not already exist — from `_energy-cards/INVOICE-PIPELINE.md.template`, substituting `{{PROJECT_NAME}}`.

- [ ] Create `.flowdeck/.creamdeck/invoices/TODO.md` if it does not already exist:
  ```markdown
  ---
  lifecycle: recurring
  recurrence: on-demand
  ---

  # invoices

  Every invoice of this project, one folder per invoice: `<invoice-id>/INVOICE.md` (the
  document) + `<invoice-id>/TODO.md` (its own paused action menu). Invoices are minted
  either from a confirmed request note (`../request-notes/` → `generate-invoice`) or
  straight from the Resolved tickets in `../tickets/` (`create-invoice-from-tickets`).
  Status runs `Draft → Issued → Paid`, with `Overdue` and `Cancelled` as side exits.

  **Playing this card only reports.** The `## BOT` steps below read files and write a
  status overview under `## HUMAN` — they never create, edit, export or send an invoice.
  Everything that writes sits in `## ACTIONS`, paused, until a human moves a line into
  `## BOT`. Action definitions: `../ACTIONS.md`. IDs, prefix and prices: `../CREAMDECK.md`
  (`## Document IDs`, `## Services`).

  ## BOT

  - [ ] List every subdirectory of this folder — each is one invoice, named after its ID. Ignore loose files (`TODO.md`, backups). If there are no subdirectories, write "no invoices yet" under `## HUMAN` and skip the remaining steps.
  - [ ] For each invoice folder, read `<folder>/INVOICE.md` and take from its header field table: **Title, ID, Status, Contact, Date, Due Date, Currency, Paid**. Then sum the `Total` column of its `## Items` table — that is the invoice's **net** value (VAT is never in the card; it is added only by `financial-export`).
  - [ ] Under `## HUMAN`, write one Markdown table per Status present — in the order `Draft`, `Issued`, `Overdue`, `Paid`, `Cancelled` — with columns `| ID | Title | Contact | Date | Due Date | Net |`, one row per invoice, and a net total line under each table. Skip a status with no invoices; do not invent rows.
  - [ ] Add a `- [ ]` item under `## HUMAN` for each **overdue** invoice: Status `Issued` and Due Date earlier than today — "chase payment or set Status to `Overdue`", naming the ID and how many days late.
  - [ ] Add a `- [ ]` item under `## HUMAN` for each **stale draft**: Status `Draft` and Date more than 7 days old — "review and run `mark-issued`, or `void` it", naming the ID.
  - [ ] Cross-check `../billed-tickets/`: for every invoice whose Status is `Paid`, if any `TICKET.md` there still carries that ID in its `Invoice` field, add a `- [ ]` item under `## HUMAN` — "play `../billed-tickets/TODO.md` → `settle-tickets` to close the tickets billed on `<id>`".
  - [ ] Report anomalies instead of fixing them: a folder with no `INVOICE.md`, a missing header field, an unparsable `## Items` table, or a `Paid` status with an empty `Paid` date — list each under `## HUMAN` as a `- [ ]` item. Never edit an `INVOICE.md` while playing this card.

  ## HUMAN

  ## ACTIONS

  <!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->
  - [ ] create-invoice-from-tickets — bill the Resolved tickets in `../tickets/`. **Step 1:** run `node .flowdeck/.creamdeck/_scripts/invoice-from-tickets.js --dry-run` from the project root and check the ticket selection and subtotal it prints — narrow it with `--tickets <id,id>` or `--stage <name>` if wrong. **Step 2:** read each selected ticket's `## Resolution` and write a client-facing summary (2–3 sentences, in the contact's language, no ticket IDs, no hours, no internal tool names) — that wording is the only part a model writes. **Step 3:** re-run without `--dry-run`, passing `--description "<summary>"`; the script mints `invoices/<id>/` as `Draft`, stamps `| Invoice | <id> |` plus an `## Updates` line into each billed `TICKET.md`, and moves those ticket folders to `../billed-tickets/`. **Step 4:** report ID, path, tickets billed and skipped, and the net subtotal, and add under `## HUMAN`: *review `INVOICE.md` before running `mark-issued`*. Never advance Status in the same play. Full options and the four billing kinds (`hours` / `fee` / `sale` / `adhoc`, priced off `CREAMDECK.md` → `## Services`) in `../ACTIONS.md`.
  - [ ] mark-issued — ask which invoice (ID or folder); run `node .flowdeck/.creamdeck/_scripts/export-invoice.js <id-or-folder>` from the project root to write `invoice-export.json`, then set Status to `Issued` in that `INVOICE.md`. Only from `Draft`, and only after a human has reviewed the document.
  - [ ] mark-paid — ask which invoice (ID or folder) and the payment date; set Status to `Paid` and fill the `Paid` field in `INVOICE.md`. Then mention `../billed-tickets/TODO.md` → `settle-tickets` under `## HUMAN` — the tickets billed on it are now closable.
  - [ ] void — ask which invoice (ID or folder); set Status to `Cancelled` in `INVOICE.md`. If tickets were billed on it, mention `../billed-tickets/TODO.md` → `unbill` under `## HUMAN` — that returns them to `../tickets/` so they can be billed again.
  - [ ] client-report — ask which invoice (ID or folder); run `node .flowdeck/.creamdeck/_scripts/client-report.js <id-or-folder> --lang <contact's language code>` from the project root to write `<folder>/client-report.html`. The script reads only client-safe fields (never `Hash`, `## Notes`, `## Updates`). Add under `## HUMAN`: *review the HTML before sending*; creamdeck never sends it.
  - [ ] financial-export — ask which invoice (ID or folder); run `node .flowdeck/.creamdeck/_scripts/financial-export.js <id-or-folder> [--provider <name>] [--vat <rate>] [--lang <code>]` from the project root — writes `invoice-proforma.html` (client preview, not a fiscal document) and `invoice-<provider>.json` (provider import payload). Lines are net; VAT is applied here (default 23). Add under `## HUMAN`: *fill the `_requires` IDs in the JSON and verify it against the provider's API docs before POSTing*. The certified invoice is issued by the provider, never by this deck.
  - [ ] draft-email — ask which invoice (ID or folder); read it and the linked contact's `../_contacts/<slug>/CONTACT.md`, make sure a client-safe artifact exists (run `client-report` or `financial-export` first if not), then scaffold `<folder>/email-draft/EMAIL.md` from `../../_energy-cards/EMAIL-DRAFT.md.template` — `To` = contact email, short cover note in the contact's language naming the invoice and its total, `Attachments` = the client-safe artifact only, **never** the raw `.md`. Draft only; surface it under `## HUMAN` for the human to send.

  <!-- Playing this card writes only the overview under ## HUMAN; blank it before the next play. -->

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
