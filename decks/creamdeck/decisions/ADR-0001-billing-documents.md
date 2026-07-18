# ADR-0001: creamdeck billing chain — proposal → request note → invoice with per-item approval hashes

**Date:** 2026-07-17
**Author:** Ruco
**Status:** Accepted

---

## Context

creamdeck (contacts, inbox, ticket pipeline) has no billing surface. Invoicing happens entirely outside it today — e.g. `clients-xxxx/.flowdeck/review-invoice-jun/TODO.md`, a one-off ad hoc card to correct and resend an invoice, with no card-based tracking of proposals, approvals, or invoice history at all.

The closest prior art is `apply-actions.js`, a retroactive timesheet/hours-reconciliation script that exists only in the `clients-xxxx` live instance (never upstreamed into the template — its own sleeve card already flags this as outstanding work). It already reasons in "the human validates before invoicing" terms, but it stops at hours reconciliation; it has no concept of a priced proposal, an approval step, or an invoice document.

The client base is majority Portuguese, where the standard billing chain is Orçamento (Proposal/Quote) → Nota de Encomenda (Request/Order Note) → Fatura (Invoice) — the same three-document shape used by Moloni, the Portuguese invoicing SaaS most likely to be the first financial-app connector built on top of this. There is no existing traceability mechanism linking a ticket (the unit of actual work) back to the priced, approved scope that authorized it.

## Decision

**We will** add three peer document types to creamdeck as a deck-template change (`flowdeck/decks/creamdeck/`, not a client-specific patch): Proposal, Request Note, and Invoice, each with its own folder, energy-card, and status lifecycle. Each proposal line item, once the proposal's Status moves to Approved, gets a deterministic hash — `sha256(proposalId|itemIndex|description|qty|unitPrice)`, truncated to 10 hex chars — minted by a script (`approve-proposal.js`), not inferred by the model. A ticket's new `Billing Ref` field can point at one such hash via a `link-proposal-item` action, proving which approved, priced line of work it belongs to. Invoices emit a provider-agnostic `invoice-export.json` (`export-invoice.js`) with no live API call — the intended attachment point for a future Moloni (or other) connector, not a connector itself. This is built independently of `apply-actions.js`; upstreaming that script remains separate, already-tracked work.

## Rationale

Hashing (not an opaque incrementing ID) makes the link tamper-evident: if a proposal item's price or description changes after approval, re-running `approve-proposal.js` recomputes and flags the mismatch instead of silently re-signing it, so a ticket's `Billing Ref` is provably tied to *that exact* approved scope and price, not just "some item that was once numbered 3." A script mints the hash rather than the model because an LLM cannot reliably compute a real cryptographic hash by reasoning — this is exactly the "deterministic scripts scaffold, the model only enriches" principle the deck already follows for `report.js`/`html.js`.

Building this independently of `apply-actions.js` keeps the two concerns — "what was priced and approved" vs. "how many hours were actually spent" — decoupled until there's a real, validated need to join them; `apply-actions.js` is also client-instance-only today, and coupling a template feature to un-upstreamed code would spread the drift further rather than resolve it.

### Pros

- Tamper-evident linkage between a ticket and the priced scope that authorized it, verifiable by recomputation, not just by trusting a foreign-key string
- Matches conventions already established in this deck (script-mints-data, model-enriches; plain-named playable folders per ADR-0005/06; `{PREFIX}{DDMMYYYY}{SEQ}` ID scheme)
- Zero new runtime dependencies — Node's built-in `crypto`, same zero-dependency posture as every other creamdeck script
- Ships as a deck-template change, so all four live instances get it the same way, on their own schedule, via `flowdeck update creamdeck`

### Cons

- Three new document types and two new scripts is a meaningfully larger surface than a typical single-blueprint deck addition
- The hash format (`sha256(...).slice(0, 10)`) is a project convention, not a standard — anyone reading a `Billing Ref` cold needs the AGENT.md to understand what it proves
- No rollup reporting yet (proposal/invoice totals aren't in `report.js`/`html.js`) — deferred as a fast-follow rather than built blind

## Alternatives Considered

### Option A: Hash the whole proposal, not each item

**Description:** Mint one hash per proposal on approval; a ticket references the proposal ID directly.

**Pros:** Simpler — one hash to mint and track per proposal.

**Cons:** A proposal often bundles several distinct deliverables at different prices; a single hash can't prove which specific line a ticket's work belongs to, or protect against one line being edited while others are untouched.

**Why rejected:** Loses exactly the traceability granularity the user asked for — "each item in a proposal ... generates a hash a ticket can be related to."

### Option B: Opaque sequential ID instead of a content hash

**Description:** Assign each item `{proposalId}-I{n}` as a stable identifier, with no cryptographic component.

**Pros:** Simpler to generate and to read; never "breaks" when content changes.

**Cons:** Not tamper-evident — editing an approved item's price after the fact leaves the identifier unchanged, so a ticket's reference silently points at a description/price that may no longer match what was actually approved.

**Why rejected:** The whole point of minting on approval is to fix what was approved. A hash that's a fingerprint of the row content is the only design in this set that can detect post-approval tampering at all.

### Option C: Depend on apply-actions.js hours data

**Description:** Build invoices so line items are populated from `apply-actions.js`'s hours/actions reconciliation rather than (or in addition to) proposal items.

**Pros:** Would auto-populate invoice quantities/descriptions from already-tracked hours, and give `apply-actions.js` a reason to be upstreamed sooner.

**Cons:** `apply-actions.js` exists in exactly one client instance today; coupling a new template feature to it either forces upstreaming it first (out of scope, per the user's explicit choice) or means the template feature only half-works until that happens.

**Why rejected:** User's explicit decision — build independently for now; upstreaming `apply-actions.js` stays separate, already-tracked work.

### Option D: Wire a live Moloni API integration now

**Description:** Have `export-invoice.js` call Moloni's API directly instead of writing a local JSON file.

**Pros:** "Done" sooner, no intermediate format to later translate.

**Cons:** No confirmed Moloni account/API credentials or field mapping exist yet; hardcoding a specific provider's schema now risks getting it wrong and reworking it later, and pulls in real auth/credential handling this deck has none of today.

**Why rejected:** The ask was for invoice output "ready to connect ... in the future," not a live connection now. `invoice-export.json` is deliberately generic (`_integration` field says so explicitly) so it's never mistaken for an already-wired connector.

## Consequences

### Positive

- A ticket can carry provable proof of the approved, priced scope it stems from — useful the moment more than one proposal or contract is in flight per client
- The billing chain is documented once, in the template, and reaches every live instance identically via `flowdeck update creamdeck`
- `invoice-export.json`'s generic shape means the actual Moloni (or alternative) integration, whenever built, starts from structured data instead of scraping Markdown tables

### Negative

- More surface area to maintain in one deck than any prior single-feature addition (3 energy-cards, 2 scripts, 1 blueprint, ~6 new ACTIONS across 3 new card types)
- No automated tests — verification is script-level (run against hand-written sample cards) and `decks-lint.mjs`, not an integration test harness

### Risks

- The hash convention is undocumented outside this deck's own `AGENT.md` — a future maintainer unfamiliar with it could assume `Billing Ref` is just a foreign key and not realize it's meant to be re-verifiable
- `apply-actions.js` upstreaming and this feature will eventually want to meet (hours feeding invoice quantities) — if that happens without revisiting this ADR, the two systems could grow incompatible assumptions about what an "item" is

## Implementation Notes

- New energy-cards: `energy-cards/PROPOSAL.md.template`, `REQUEST-NOTE.md.template`, `INVOICE.md.template`; `TICKET.md.template` gains a `Billing Ref` row
- New scripts: `scripts/approve-proposal.js` (hash minting/verification), `scripts/export-invoice.js` (`invoice-export.json` writer) — both self-contained zero-dep ESM, matching `report.js`/`html.js`'s style (own `field()`/table-parsing helpers, no shared module)
- New blueprint: `blueprints/creamdeck-new-proposal` (`lifecycle: one-shot`); request notes and invoices are always generated downstream via `generate-request-note` / `generate-invoice` actions, never opened cold, so no separate blueprints exist for them
- `manifest.json` bumped `0.6.0` → `0.7.0`; `sleeve-cards/creamdeck-init` scaffolds `proposals/`, `request-notes/`, `invoices/` and installs both new scripts, mirroring how `tickets/` is already bootstrapped
- `CREAMDECK.md.template`'s `## Ticket ID` section renamed `## Document IDs`, extended with `{PREFIX}P/R/I{DDMMYYYY}{SEQ}` formats — tickets keep their existing unprefixed ID, no migration needed
- `AGENT.md`/`AGENT-section.md` document the full chain under a new "Billing lifecycle" heading; `DECKS.md` and `README.md` registry rows updated
- Verification: `node flowdeck/tools/decks-lint.mjs` (no new findings beyond pre-existing, unrelated `founderdeck` ones) plus a scratchpad run of both new scripts against hand-written sample `PROPOSAL.md`/`INVOICE.md` cards — no live client `.flowdeck/.creamdeck/` instance touched
- Explicitly deferred: `report.js`/`html.js` rollups for proposals/invoices; a `PIPELINE.md`-style stage doc for the new types (their status is a plain enum, not a multi-stage pipeline); any live Moloni API call; propagation into any client's live instance (each project's own `flowdeck update creamdeck`, at its own discretion)

---
