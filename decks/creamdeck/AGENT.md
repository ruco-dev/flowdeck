# creamdeck

The `.flowdeck/.creamdeck/` directory is a minimal, project-scoped CRM deck. It tracks contacts and incoming communications (emails, calls) relevant to this project.

**Standing cards (created by `creamdeck-init`):**
- `.flowdeck/.creamdeck/creamdeck-inbox/` — `TODO.md` — all incoming items (emails routed from emaildeck, logged calls); each item is a subfolder with `INBOX-ITEM.md` + `TODO.md`

**Per-instance cards:**
- `.flowdeck/.creamdeck/_contacts/<slug>/` — `CONTACT.md` + `TODO.md` — one per tracked contact; created from an inbox item or directly via `creamdeck-add-contact`
- `.flowdeck/.creamdeck/tickets/<YYYY-MM-DD>-<slug>/` — `TICKET.md` + `TODO.md` — one per ticket; opened via `creamdeck-open-ticket` or the `open-ticket` action in `tickets/TODO.md`
- `.flowdeck/.creamdeck/closed-tickets/<YYYY-MM-DD>-<slug>/` — a closed ticket, moved here (not deleted) by the `close` / `close-ticket` action when Stage is set to Closed; `reopen` in `closed-tickets/TODO.md` moves it back to `tickets/`
- `.flowdeck/.creamdeck/proposals/<YYYY-MM-DD>-<slug>/` — `PROPOSAL.md` + `TODO.md` — one per proposal; opened via `creamdeck-new-proposal` or the `new-proposal` action in `proposals/TODO.md`
- `.flowdeck/.creamdeck/request-notes/<YYYY-MM-DD>-<slug>/` — `REQUEST-NOTE.md` + `TODO.md` (+ `attachments/`) — one per request note; always generated from an approved proposal via its `generate-request-note` action, never opened cold
- `.flowdeck/.creamdeck/invoices/<YYYY-MM-DD>-<slug>/` — `INVOICE.md` + `invoice-export.json` + `TODO.md` — one per invoice; always generated from a request note (or, if that step is skipped, directly from a proposal) via its `generate-invoice` action

**Inbox item lifecycle:**
1. Item arrives (emaildeck routes a thread, or you log a call via `create-inbox-item`)
2. Inbox management card is played — bot surfaces unrouted items
3. Per-item `TODO.md` is played — bot summarises and activates ACTIONS
4. Human picks an action: `create-contact`, `log-to-contact`, `draft-reply`, `route-to-crunchdeck`, `schedule-follow-up`, or `archive`

**Ticket lifecycle:**
1. Ticket is opened via `creamdeck-open-ticket` — stage defaults to New
2. Ticket card is played — bot surfaces summary and flags stale Waiting tickets
3. Human advances stage, logs updates, drafts replies, or closes the ticket
4. Stage sequence: New → Open → Awaiting Quote → Waiting → Blocked → Resolved → Closed (a ticket may skip stages or move back; the pipeline is a guide, not a gate)
5. Closing to **Closed** specifically (not Resolved) moves the ticket folder from `tickets/<id>/` to `closed-tickets/<id>/` — archived, not deleted. `report.js`/`html.js` scan both directories, so closed tickets still count toward stage totals and reports. `reopen` (an action on `closed-tickets/TODO.md`) moves a ticket back to `tickets/<id>/` and resets Stage to Open.

**Billing lifecycle:** a proposal → request note → invoice chain, mirroring the standard Orçamento → Nota de Encomenda → Fatura sequence (the same shape Moloni uses). Each step is independent of the ticket/hours system — it does not read from `TICKET.md`'s `Hours Real`; a ticket only *references* an approved proposal item once linked.

1. **Proposal** (`creamdeck-new-proposal` or the `new-proposal` action in `proposals/TODO.md`) — a priced line-item list against a contact. Status: Draft → Sent → Approved / Rejected / Expired.
2. **Approval mints hashes** — the `mark-approved` action runs `_scripts/approve-proposal.js <id>`, a deterministic script (not the model — hashing must be exact). For every item still missing one, it mints `sha256(proposalId|itemIndex|description|qty|unitPrice)` truncated to 10 hex chars into that row's `Hash` cell, and sets Status to Approved with today's date in `Approved`. Re-running is idempotent: a hash that already matches its row is left alone; a hash that no longer matches (the row was edited after approval) is left alone too and reported as a mismatch — hashes are a tamper-evident fingerprint of what was approved and are never silently re-signed. This hash is what a ticket links to.
3. **Request note** (`generate-request-note` action on an approved proposal's `TODO.md`) — a formal order/work confirmation. Check `.flowdeck/.creamdeck/request-notes/` exists; if not, create it, scaffold `request-notes/PIPELINE.md` from `_energy-cards/REQUEST-NOTE-PIPELINE.md.template` (substitute `{{PROJECT_NAME}}`), and create its overview `TODO.md` (same shape as `proposals/TODO.md`, list + status surfacing, no `new-*` action since a request note is always generated, never opened cold). Ask which approved items to carry over (default: all). Generate the ID (`{PREFIX}R{DDMMYYYY}{SEQ}`, own daily sequence — see `CREAMDECK.md` "Document IDs"). Scaffold `request-notes/<id>/REQUEST-NOTE.md` from `_energy-cards/REQUEST-NOTE.md.template`, copying the selected rows verbatim (Hash included) from the proposal's `PROPOSAL.md`. Scaffold the per-note `TODO.md` with ACTIONS `attach-pdf` (copy a client-side-original PDF into `request-notes/<id>/attachments/` and record its relative path in `Source PDF`), `mark-confirmed` (Status → Confirmed), `generate-invoice`. Status: Draft → Sent → Confirmed.
4. **Invoice** (`generate-invoice` action on a confirmed request note's `TODO.md`, or directly on an approved proposal if the request-note step is skipped) — check `.flowdeck/.creamdeck/invoices/` exists; if not, create it, scaffold `invoices/PIPELINE.md` from `_energy-cards/INVOICE-PIPELINE.md.template` (substitute `{{PROJECT_NAME}}`), and create its overview `TODO.md` (same shape, no `new-*` action). Generate the ID (`{PREFIX}I{DDMMYYYY}{SEQ}`). Scaffold `invoices/<id>/INVOICE.md` from `_energy-cards/INVOICE.md.template`, copying items (Hash preserved) from the request note or proposal; ad hoc lines not tied to any proposal item are allowed, with `Hash` left `—`. **Before including a hashed item, check whether any ticket's `Billing Ref` points at it.** If one does and that ticket's `Stage` isn't Resolved or Closed, surface it under `## HUMAN` instead of silently invoicing undelivered work — a linked-but-unfinished ticket means the scope is authorized, not delivered. An item with no linked ticket at all is unaffected by this check (linkage is optional, not required — see "Authorization vs. delivery vs. invoicing" below). Scaffold the per-invoice `TODO.md` with ACTIONS `mark-issued` (runs `_scripts/export-invoice.js <id>`, then Status → Issued), `mark-paid` (Status → Paid, fill `Paid` date), `void` (Status → Cancelled). Status: Draft → Issued → Paid / Overdue / Cancelled.
5. **`invoice-export.json`** — written by `export-invoice.js` next to `INVOICE.md`: `{ id, status, issueDate, dueDate, currency, contact, proposalId, requestNoteId, lines: [{ description, quantity, unitPrice, total, hash }], totals: { subtotal, tax, total }, _integration }`. This is a provider-agnostic export, not a live connector — no API call is made. It is the intended attachment point for a future financial-app integration (Moloni is the likely first target); `_integration` says so explicitly so it's never mistaken for an already-wired connection.
6. **Ticket linkage** — a ticket's `Billing Ref` field (in `TICKET.md`) records which approved proposal item authorized its work: `<proposal-id>#<item-number> · <hash>`. Set via the `link-proposal-item` action on a ticket's `TODO.md`, which verifies the referenced item's hash is already minted (i.e. the proposal has been approved) before writing it in. **This is the only gate — the ticket's own `Stage` is never checked.** A ticket can be linked the moment it's opened, still `New`, with zero hours logged; the link only claims "this scope, when finished, bills against this item," not that it's finished.

**Authorization vs. delivery vs. invoicing** (ADR-0002): these are three separate questions, each answered by a different mechanism, and none of them should be inferred from another:
- *Is this scope priced and approved?* — the proposal item's hash existing (`mark-approved` has run).
- *Is this specific ticket's work done?* — the ticket's own `Stage` field (Resolved/Closed), unrelated to billing.
- *Is it safe to invoice?* — requires **both** of the above together, checked once, at the one place that matters: step 4 above. `link-proposal-item` deliberately does not check `Stage`, so linking early (even to a brand-new ticket) is normal and expected, not a shortcut.

**emaildeck integration:** configure an emaildeck filter with `send-to-creamdeck` in its default tasks to route matched threads automatically into `.creamdeck/creamdeck-inbox/`.

**crunchdeck integration:** any inbox item can be forwarded to `.crunchdeck/crunchdeck-inbox/` via the `route-to-crunchdeck` action, turning a contact signal into a product signal.

**calendardeck integration (`add-meeting`):** if `.flowdeck/.calendardeck/` is not installed, surface a `## HUMAN` note to run `calendardeck-init` first and skip. Otherwise, when `add-meeting` is played on a ticket:
1. Ask for the meeting date (`YYYY-MM-DD`) and an optional follow-up date if not already provided under `## HUMAN`.
2. Generate a slug from the ticket title (kebab-case, max 40 characters).
3. Scaffold `.flowdeck/.calendardeck/_events/<date>-<slug>/EVENT.md` from calendardeck's `_energy-cards/EVENT.md.template` (calendardeck owns this path and shape — see its AGENT.md "Quick Events" and ADR-0003), populating `Ticket` (this ticket's ID), `Contact` (the ticket's linked contact), `Date`, `Follow-up`, and `Status` (default: Scheduled) from the ticket's own fields.
4. Write the resulting path back into `TICKET.md` under a new `| Meeting |` row (add it if missing), and append a line to the Updates section: `**{{DATE}}** · Meeting scheduled — see calendardeck event`.
5. creamdeck never reads back from calendardeck after this — it is a one-time write, not an ongoing sync. Rescheduling means editing `EVENT.md` directly.

**Blueprints (mortal templates — each play mints a new meldable card):**
- `creamdeck-add-contact` — create a new contact card directly (without going through inbox)
- `creamdeck-open-ticket` — open a new ticket card
- `creamdeck-new-proposal` — draft a new proposal card. Request notes and invoices are never opened cold — they're always generated downstream via the `generate-request-note` / `generate-invoice` actions (see "Billing lifecycle" above).

**Sleeve residents & `sleeveCards`:**

The manifest's `sleeveCards` field lists exactly one card: `creamdeck-init`. It is a **ritual** (`lifecycle: ritual`, `recurrence: on-demand`): `flowdeck install creamdeck` copies it into the deck's own `_sleeve/` (`.flowdeck/.creamdeck/_sleeve/`) and plays it in place; replaying it is `flowdeck install creamdeck --repair` (every step create-if-missing). It is never melded.

`sleeveCards` holds no operational instruments beyond init — every creamdeck standing card (`creamdeck-inbox/`, `_contacts/<slug>/`, `tickets/`) is scaffolded by the init ritual inline rather than shipped as a separate blueprint or sleeve resident, and none of them acts on a folder distinct enough to warrant a standalone folder card. the board's root `_sleeve/` is reserved for project-generic / cross-cutting instruments; a deck's own `_sleeve/` holds its rituals (e.g. the default `release` card); creamdeck adds none. A deck whose init is its only sleeve resident is the common case, per emaildeck's own AGENT.md note.

`flowdeck install`/`update creamdeck` installs `report.js`, `html.js`, `approve-proposal.js`, `export-invoice.js`, `client-report.js`, and `financial-export.js` straight into `.flowdeck/.creamdeck/_scripts/` — `manifest.scripts` routes there directly because `installRoot` is set, no separate staging copy involved. See "Reports & exports" below for the runtime paths.

## Reports & exports

`creamdeck-init` installs two scripts into `.flowdeck/.creamdeck/_scripts/`. Run them from the project root via the `tickets/TODO.md` ACTIONS (never as bare `node …` commands in user-facing docs):

- `_scripts/report.js` — rebuilds `tickets/REPORT.md` (hours subtotals per stage + grand total), scanning both `tickets/` and `closed-tickets/`. Action: `generate-report`.
- `_scripts/html.js` — renders a static HTML site under `_report/`, same dual-directory scan. Action: `export-report`.
- `_scripts/html.js --lang <code>` — renders a localized copy under `_report/<code>/`. Action: `export-report --lang <code>`.

**Translation flow** (`export-report --lang`): the agent reads each `TICKET.md`, translates `title` / `description` / `updates` / `resolution` into the target language, writes them to `_report/<code>/.translations.json` (keyed by ticket ID), then re-runs `_scripts/html.js --lang <code>`. The script renders from that manifest, falling back to the original text for any missing ticket or field.

### Client-facing exports (billing documents)

Three actions turn a billing document into something the client can receive. All three are **draft-not-send**: they write a file next to the source document, then **surface a `## HUMAN` task on that card** so the human gate (review / fill IDs / send) is tracked in the workflow, never left implicit. See `ACTIONS.md` for the full action reference.

- `_scripts/client-report.js <doc-id> [--lang <code>]` — renders `<doc-folder>/client-report.html`, a **client-safe projection** of a proposal / request note / invoice. Action: `client-report` (on the `proposals`, `request-notes`, and `invoices` cards). It is a **whitelist**: only the header fields the type declares plus the item table's client columns (`# / Description / Qty / Unit Price / Total`) are read. The `Hash` column, `## Notes`, and `## Updates` — where internal data lives (hours est-vs-real, ticket refs, `Billing Ref`, hash-remint history, pricing caveats, approval deliberation) — are **never read**, so adding an internal field to a source doc can never leak it. After running, the action adds a `## HUMAN` task: *review `client-report.html` and confirm no internal detail before sending.*
- `_scripts/financial-export.js <invoice-id> [--provider <name>] [--vat <rate>] [--lang <code>]` — from an `INVOICE.md`, writes `invoice-proforma.html` (a preview watermarked **not a fiscal invoice**) **and** `invoice-<provider>.json` (the chosen provider's import payload). Action: `financial-export` (on the `invoices` card). **The platform is an option, not hardcoded**: `--provider` selects from the `PROVIDERS` registry in the script (default and only entry today: `moloni`; add a provider = add a registry entry). PT/SAF-T: the certified invoice must be issued **by** the provider — this script never emits a fiscal document; the JSON is the *input* that creates the real invoice there. Account-specific IDs (Moloni: `company_id`, `customer_id`, `document_set_id`, `tax_id`) are emitted `null` under `_requires`; line items are **net**, VAT applied at `--vat` (default 23). No API call is made. After running, the action adds a `## HUMAN` task: *fill the provider's `_requires` IDs in `invoice-<provider>.json` and verify the payload against the provider's API docs before POSTing.*
- `draft-email` (agent-performed, on any billing card) — composes a cover email from the document into `<doc-folder>/email-draft/EMAIL.md` (from `_energy-cards/EMAIL-DRAFT.md.template`), in the contact's language, attaching the **client-safe** artifact (`client-report.html` / `invoice-proforma.html`), never the raw `.md`. Never dispatched by creamdeck. After drafting, the action adds a `## HUMAN` task: *review `email-draft/EMAIL.md` and send it (or hand to emaildeck's `draft-email` for a Gmail draft).*

## Client data & deploy config

- **`_report/` output is client data.** The generated `_report/` tree (and any `.translations.json`) belongs to the installed project — it is git-committable there, but must **never** be promoted back into the deck template. When editing the `creamdeck` deck source, keep it free of any generated report or ticket content.
- **Billing documents are client data too.** `proposals/`, `request-notes/` (including its `attachments/` PDFs), and `invoices/` hold real pricing and client billing information once populated — along with every generated artifact next to a source doc: `invoice-export.json`, `client-report.html`, `invoice-proforma.html`, `invoice-<provider>.json`, and any `email-draft/`. All git-committable in the installed project, **never** promoted back into the deck template. When editing the `creamdeck` deck source, keep it to the blank `.md.template`/script files only.
- **Deploy configuration lives outside the repo.** SFTP/host credentials or publish settings for the `_report/` site must not be committed anywhere in the project — keep them in the environment or an untracked local config. (Prompted by a prior plaintext-SFTP-credential incident.)
