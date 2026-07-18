## creamdeck

The `.flowdeck/.creamdeck/` directory is a minimal, project-scoped CRM deck. It tracks contacts and incoming communications (emails, calls) relevant to this project.

**Standing cards (created by `creamdeck-init`):**
- `.flowdeck/.creamdeck/creamdeck-inbox/` — `TODO.md` — all incoming items (emails routed from emaildeck, logged calls); each item is a subfolder with `INBOX-ITEM.md` + `TODO.md`

**Per-instance cards:**
- `.flowdeck/.creamdeck/_contacts/<slug>/` — `CONTACT.md` + `TODO.md` — one per tracked contact; created from an inbox item or directly via `creamdeck-add-contact`
- `.flowdeck/.creamdeck/tickets/<YYYY-MM-DD>-<slug>/` — `TICKET.md` + `TODO.md` — one per ticket; opened via `creamdeck-open-ticket` or the `open-ticket` action in `tickets/TODO.md`
- `.flowdeck/.creamdeck/proposals/<YYYY-MM-DD>-<slug>/` — `PROPOSAL.md` + `TODO.md` — one per proposal; opened via `creamdeck-new-proposal` or the `new-proposal` action in `proposals/TODO.md`
- `.flowdeck/.creamdeck/request-notes/<YYYY-MM-DD>-<slug>/` and `.flowdeck/.creamdeck/invoices/<YYYY-MM-DD>-<slug>/` — always generated downstream (never opened cold) via `generate-request-note` / `generate-invoice`

**Inbox item lifecycle:**
1. Item arrives (emaildeck routes a thread, or you log a call via `create-inbox-item`)
2. Inbox management card is played — bot surfaces unrouted items
3. Per-item `TODO.md` is played — bot summarises and activates ACTIONS
4. Human picks an action: `create-contact`, `log-to-contact`, `draft-reply`, `route-to-crunchdeck`, `schedule-follow-up`, or `archive`

**Ticket lifecycle:**
1. Ticket is opened via `creamdeck-open-ticket` — stage defaults to New
2. Ticket card is played — bot surfaces summary and flags stale Waiting tickets
3. Human advances stage, logs updates, drafts replies, or closes the ticket
4. Stage sequence: New → Open → Awaiting Quote → Waiting → Blocked → Resolved → Closed

**Billing lifecycle:** Proposal (Draft→Sent→Approved/Rejected/Expired, `creamdeck-new-proposal`) → approval mints a per-item hash (`mark-approved` runs `_scripts/approve-proposal.js`, a deterministic script — hashing is never done by the model; re-runs are idempotent and a content-mismatched hash is flagged, never re-signed) → Request Note (Draft→Sent→Confirmed, `generate-request-note`, carries an `attachments/` PDF via `attach-pdf`) → Invoice (Draft→Issued→Paid/Overdue/Cancelled, `generate-invoice`; `mark-issued` runs `_scripts/export-invoice.js` to write a provider-agnostic `invoice-export.json`, ready for a future financial-app connector such as Moloni — no live API call). A ticket's `Billing Ref` field links to one approved proposal item's hash via the `link-proposal-item` action; this is independent of ticket hours tracking.

**emaildeck integration:** configure an emaildeck filter with `send-to-creamdeck` in its default tasks to route matched threads automatically into `.creamdeck/creamdeck-inbox/`.

**crunchdeck integration:** any inbox item can be forwarded to `.crunchdeck/crunchdeck-inbox/` via the `route-to-crunchdeck` action, turning a contact signal into a product signal.

**Blueprints (mortal templates — each play mints a new meldable card):**
- `creamdeck-add-contact` — create a new contact card directly (without going through inbox)
- `creamdeck-open-ticket` — open a new ticket card
- `creamdeck-new-proposal` — draft a new proposal card (request notes and invoices are always generated downstream, never opened cold)

**Sleeve residents & `sleeveCards`:**

The manifest's `sleeveCards` field lists exactly one card: `creamdeck-init`. It is a **ritual** (`lifecycle: ritual`, `recurrence: on-demand`): `flowdeck install creamdeck` copies it into the deck's own `_sleeve/` (`.flowdeck/.creamdeck/_sleeve/`) and plays it in place; replaying it is `flowdeck install creamdeck --repair` (every step create-if-missing). It is never melded.

`sleeveCards` holds no operational instruments beyond init — every creamdeck standing card is scaffolded by init inline, not shipped as a separate blueprint or sleeve resident. the board's root `_sleeve/` is reserved for project-generic / cross-cutting instruments; a deck's own `_sleeve/` holds its rituals (e.g. the default `release` card); creamdeck adds none. A deck whose init is its only sleeve resident is the common case, per emaildeck's own AGENT.md note.

**Reports:** `creamdeck-init` installs `_scripts/report.js` (→ `tickets/REPORT.md`) and `_scripts/html.js` (→ static `_report/` site; `--lang <code>` renders a translated copy from `_report/<code>/.translations.json`). Run them via the `generate-report` / `export-report` / `export-report --lang <code>` actions in `tickets/TODO.md`. `creamdeck-init` also installs `_scripts/approve-proposal.js` and `_scripts/export-invoice.js` — see "Billing lifecycle" above. The `_report/` output, and once populated `proposals/`, `request-notes/` (its `attachments/`), and `invoices/` (its `invoice-export.json`), are all **client data** — git-committable in the project but never promoted back into the deck template; deploy credentials stay outside the repo.
