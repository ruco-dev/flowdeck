# creamdeck Actions

Reference for every action creamdeck cards expose. An action is **paused** while it sits under a card's `## ACTIONS`; to run it, move the line into `## BOT` (bot executes) or `## HUMAN` (you handle it) on that card's `TODO.md`. Scripts are invoked from the project root and installed at `.flowdeck/.creamdeck/_scripts/` by `flowdeck install`/`update creamdeck`.

## Catalog by card

| Card | Actions |
|------|---------|
| `_contacts/<name>/` | `draft-email`, `log-interaction`, `schedule-follow-up`, `route-to-crunchdeck`, `sync-from-inbox` |
| `creamdeck-inbox/` | `create-inbox-item`; per item: `draft-reply`, `create-contact`, `log-to-contact`, `route-to-crunchdeck`, `schedule-follow-up`, `archive` |
| `tickets/` | `open-ticket`, `close-ticket`, `generate-report`, `export-report`, `export-report --lang <code>`, `add-meeting` |
| `billed-tickets/` | `settle-tickets`, `unbill`, `reopen` |
| `closed-tickets/` | `reopen` |
| `proposals/` | `new-proposal`, `mark-approved`, `send`, `mark-rejected`, `generate-request-note`, `log-update`, **`client-report`**, **`draft-email`** |
| `request-notes/` | `attach-pdf`, `mark-confirmed`, `generate-invoice`, **`client-report`**, **`draft-email`** |
| `invoices/` | **`create-invoice-from-tickets`**, `mark-issued`, `mark-paid`, `void`, **`client-report`**, **`financial-export`**, **`draft-email`** |

The billing-chain actions are covered in `AGENT.md` → "Billing lifecycle". The client-facing and ticket-billing actions are documented in full below.

---

## create-invoice-from-tickets

Mint a `Draft` invoice from billable tickets in `tickets/` without writing a single line of numbers yourself.

**Trigger:** `- [ ] create-invoice-from-tickets` on the `invoices/` card.

**Step 1 — dry run.** Run `node .flowdeck/.creamdeck/_scripts/invoice-from-tickets.js --dry-run` from the project root. It prints a JSON summary: which tickets were selected, their billing kind/qty/price, and the net subtotal. Narrow the selection with `--tickets <id,id>` (explicit list) or `--stage <name>` (default: `Resolved`). Fix any ticket that shows up in `skipped` (set `Hours Real`, `Billing Rate`, or `Billing Kind` as indicated).

**Step 2 — write the client description.** Read each selected ticket's `## Resolution`. Write a 2–3 sentence client-facing summary: no ticket IDs, no hours, no internal tool names. This is the only judgment step — everything else is arithmetic.

**Step 3 — run for real.** `node .flowdeck/.creamdeck/_scripts/invoice-from-tickets.js --description "<summary>"`. The script: mints the invoice ID, scaffolds `invoices/<id>/INVOICE.md` + `TODO.md` as `Draft`, stamps `| Invoice | <id> |` into each billed `TICKET.md`, and moves those ticket folders to `billed-tickets/`.

**Step 4 — report.** Surface the invoice ID, path, tickets billed/skipped, and net subtotal. Add under `## HUMAN`: *review `INVOICE.md` before running `mark-issued`*. Never advance Status in the same play.

**Billing kinds** (declared per ticket in its `Billing Kind` field; default `hours`):
- `hours` — qty = `Billing Qty` ?? `Hours Real`, unit Hour, rate from `## Services`
- `fee` — qty = `Billing Qty` ?? 1, unit Fee, rate from `## Services` or `Billing Rate`
- `sale` — qty = `Billing Qty` ?? 1, unit Item, rate from `Billing Rate` or `## Services`
- `adhoc` — qty 1, price = `Billing Amount` (required); never grouped

A ticket already carrying an `Invoice` value is skipped — a ticket is billed once.

---

## client-report

Render a **client-safe** HTML statement from a proposal, request note, or invoice.

**Trigger:** `- [ ] client-report` on a `proposals` / `request-notes` / `invoices` card, or on a specific document's `TODO.md`.

Run: `node .flowdeck/.creamdeck/_scripts/client-report.js <doc-id-or-folder> [--lang <code>]` from the project root. Writes `<doc-folder>/client-report.html` (replaced each run). Use the contact's language (`--lang pt-PT` for a Portuguese client).

**Whitelist, by design.** The script reads **only** the header fields the document type declares plus the item table's client columns (`# / Description / Qty / Unit Price / Total`). It never reads the `Hash` column, the `## Notes` section, or the `## Updates` section — so internal data (hours est-vs-real, ticket refs, `Billing Ref`, hash-remint history, pricing caveats, approval deliberation) cannot leak, even if someone adds a new internal field later.

**Human gate.** After running, add under the card's `## HUMAN`: *review `client-report.html` and confirm it carries no internal detail before sending to the client.* This is draft-not-send — the file is never dispatched by creamdeck.

---

## financial-export

From an `INVOICE.md`, produce a client-facing **proforma** and a **provider import payload**. The financial platform is an **option**, selected with `--provider` — never hardcoded.

**Trigger:** `- [ ] financial-export` on an `invoices` card, or on a specific invoice's `TODO.md`.

Run: `node .flowdeck/.creamdeck/_scripts/financial-export.js <invoice-id-or-folder> [--provider <name>] [--vat <rate>] [--lang <code>]` from the project root. Writes, next to `INVOICE.md`:
- `invoice-proforma.html` — subtotal + VAT + total, watermarked **not a fiscal invoice**. Provider-agnostic preview for the client, not a legal document.
- `invoice-<provider>.json` — the chosen provider's import payload.

**Providers.** `--provider` selects from the `PROVIDERS` registry in the script. Today the only entry — and the default — is `moloni`; an unknown name errors with the available list. Add a platform by adding a registry entry (`label`, `file`, `requires`, `build`); nothing else in the flow is provider-aware.

**PT / SAF-T:** the certified invoice must be issued **by** the provider. This action never emits a fiscal document; the JSON is the *input* that creates the real invoice in the provider, where it is legally issued.

Line items are **net**; VAT is applied at `--vat` (default `23`). Account-specific IDs — for Moloni `company_id`, `customer_id`, `document_set_id`, `tax_id` — cannot be derived from a card and are emitted `null` under `_requires`. No API call is made.

**Human gate.** After running, add under the card's `## HUMAN`: *fill the provider's `_requires` IDs in `invoice-<provider>.json` and verify the payload against the provider's API docs before POSTing.*

---

## draft-email

Compose a cover email from a billing document — **agent-performed** (wording is judgment), draft-not-send.

**Trigger:** `- [ ] draft-email` on any `proposals` / `request-notes` / `invoices` card.

When activated:
1. Read the source document and its linked contact's `_contacts/<slug>/CONTACT.md` (name, email).
2. Ensure a client-safe artifact exists — run `client-report` (or `financial-export` for an invoice) first if it doesn't.
3. Scaffold `<doc-folder>/email-draft/EMAIL.md` from `_energy-cards/EMAIL-DRAFT.md.template`: `To` = contact email, `Subject` + `Body` a short cover note in the contact's language referencing the document and its total, `Attachments` = the client-safe artifact (`client-report.html` / `invoice-proforma.html`) — **never** the raw `.md`, which carries the internal `## Notes` / `## Updates`.
4. Surface under `## HUMAN` that the draft is ready to review and send.

Never dispatched by creamdeck. Send by hand, or hand it to emaildeck's `draft-email` action to create a Gmail draft.

---

<!-- Add your own actions below -->
