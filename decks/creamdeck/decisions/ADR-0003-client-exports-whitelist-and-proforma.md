# ADR-0003: Client-safe export uses a whitelist; proforma is never a fiscal invoice

**Date:** 2026-07-26
**Author:** Ruco
**Status:** Accepted

---

## Context

`creamdeck-client-exports` added three draft-not-send client-facing actions on the billing cards: `client-report` (a sanitised HTML projection of a proposal/request-note/invoice), `financial-export` (a proforma preview + provider import payload), and `draft-email` (a cover email targeting the client-safe artifact). Two fundamental design questions had to be settled before any code was written:

1. **Projection strategy for client-report.** Creamdeck billing documents mix public line items with internal data — the `Hash` column, `## Notes` / `## Updates` carrying hours estimates and actuals, ticket references, `Billing Ref` hash history, pricing caveats, and approval deliberation. The question is how to prevent internal fields from leaking into the client-facing HTML: enumerate what to hide (blacklist), or enumerate only what to include (whitelist).

2. **Nature of the invoice proforma.** In Portugal, a legally recognised invoice (Fatura) must be issued through certified invoicing software that generates SAF-T/AT-signed records (e.g. Moloni). creamdeck is not certified invoicing software. The question is whether `financial-export` should produce a document the client could treat as an invoice, or explicitly something else.

Both decisions govern how `scripts/client-report.js` and `scripts/financial-export.js` behave and how future maintainers should evolve them.

## Decision

### 1 — Client-safe = whitelist, not blacklist

**We will** implement `client-report.js` as a whitelist: it reads only the document type's declared header fields (`Status`, `Date`, `Client`, `Total` and their peers) and the explicit item columns (`#`, `Description`, `Qty`, `Unit Price`, `Total`). It never reads `## Notes`, `## Updates`, or the `Hash` column. Adding new internal fields to a source document cannot retroactively leak them.

The last gate before the artifact reaches a client is still a human review step filed on the source card's `## HUMAN` section each time the action runs.

### 2 — Proforma preview + import payload; never a look-alike fiscal invoice

**We will** have `financial-export.js` produce two artefacts:

- `invoice-proforma.html` — a human-readable preview of the invoice, watermarked **"NOT A FISCAL INVOICE — for preview only"** in a mandatory banner that cannot be suppressed.
- `invoice-<provider>.json` — a structured import payload for the target provider (default: `moloni`), scoped to the fields and shape that provider's import API accepts.

creamdeck emits the *input* that creates the fiscal document inside a certified platform. It does not emit the fiscal document itself. A future maintainer must not remove the watermark, style the proforma to look like a finished Fatura, or add a path that bypasses the provider import step.

## Rationale

### Whitelist

A blacklist requires knowing every current and future internal field. New data fields (future energy-card additions, client notes, internal flags) would need the blacklist updated in lockstep or they leak silently. A whitelist inverts the risk: the default is "not shared"; a field has to be explicitly promoted to be included. Since internal data almost always lives in sections or columns the client never needs to see (`## Notes`, `## Updates`, `Hash`), the whitelist can name only five or six columns and still cover all client-visible content.

The whitelist design also makes the projection auditable: reading `client-report.js` tells you, completely and immediately, what can appear in the client-facing output — no need to cross-reference a list of things that were excluded.

### Proforma boundary

Portuguese law (`Decreto-Lei n.º 28/2019`) mandates that invoices be issued by software certified by the Autoridade Tributária (AT), generating SAF-T records and ATCUD codes. Producing an HTML page styled like a `Fatura`, without those legal requirements met, would be at best confusing and at worst constitute a forged fiscal document in a legal dispute. The watermark is not an aesthetic choice — it is a legal boundary marker.

The provider-import-payload separation (`invoice-moloni.json` vs. the proforma) keeps the two concerns distinct: the proforma is for the client to review and confirm figures; the JSON payload is the machine-readable input to the platform that will actually issue the certified document. They can evolve independently (different schema versions, new providers) without conflating "what the client sees" with "what the platform receives."

### Pros

- A new internal field added to any billing template cannot leak into client output by default (whitelist).
- The human review gate is always present — drafting the artifact and shipping it are two distinct, explicit steps.
- The proforma's watermark means neither clients nor third parties can mistake it for a legally valid invoice; creamdeck carries no liability for issued invoices.
- Adding a second financial platform = one new entry in the `PROVIDERS` registry in `financial-export.js`; no structural rework required.

### Cons

- If a new field is genuinely client-visible (e.g. a future `Discount` column), `client-report.js` needs an explicit update to include it — the whitelist does not expand automatically.
- Two output files per financial-export run (proforma + JSON) means slightly more artifact management on the card; they are co-located in the invoice folder, so navigation is not materially harder.

## Alternatives Considered

### Option A: Blacklist internal columns and sections

**Description:** Enumerate the columns and sections to strip (`Hash`, `## Notes`, `## Updates`, `Billing Ref`) and pass everything else through.

**Pros:** No code change needed when a new client-visible column is added.

**Cons:** Every new internal field also requires a blacklist update or it leaks; the set of "what could be internal" is unbounded and changes over time.

**Why rejected:** The whitelist is strictly safer and equally maintainable for a document type with a fixed set of client-visible fields.

### Option B: Produce a styled invoice PDF or HTML without a watermark

**Description:** Render `financial-export.js`'s output as a polished, letterhead-quality invoice that the user could print and hand to a client as their invoice.

**Pros:** Saves the round-trip through Moloni for clients who don't use certified software.

**Cons:** Illegal in Portugal for B2B and B2C transactions above thresholds set by the AT; creates legal exposure for the user (forged fiscal document), not just a user-experience problem.

**Why rejected:** Non-starter. The proforma exists precisely so the user can confirm figures with a client without bypassing the legal requirement.

### Option C: Hard-code the Moloni schema; no provider abstraction

**Description:** `financial-export.js` outputs `invoice-moloni.json` only; no `--provider` flag.

**Pros:** Simpler implementation; no unused abstraction.

**Cons:** The user's billing platform could change; a second client could use a different platform; the refactor cost later is higher than a small registry now.

**Why rejected:** The `PROVIDERS` registry adds ~10 lines and future-proofs the design without meaningful complexity. The flag errors with the available list on an unknown provider name, so the surface is self-documenting.

## Consequences

### Positive

- Internal deliberation, estimates, and hash history can be written freely in `## Notes` / `## Updates` without any risk of leaking into the client artifact.
- The proforma and import payload are independently reviewable and evolvable.
- Any future PT invoicing-platform integration starts from structured JSON, not Markdown parsing.

### Negative

- Maintainers adding new client-visible fields to a billing template must also update `client-report.js`'s field whitelist — a coordination point that could drift.

### Risks

- If the watermark markup is removed by a future edit (styling cleanup, template refactor), the proforma again looks like a fiscal document. The banner's HTML carries an inline comment (`<!-- legal boundary — do not remove -->`) to discourage this; a code review should flag any removal.

## Implementation Notes

- `scripts/client-report.js` — reads `HEADER_FIELDS` per doc type (const at top of file); item columns `#`/`Description`/`Qty`/`Unit Price`/`Total` are the only table columns ever extracted; `## Notes`, `## Updates`, `Hash` are never referenced.
- `scripts/financial-export.js` — `PROVIDERS` registry + `--provider` flag (default `moloni`); proforma banner rendered as a fixed `<div>` before the invoice table; `_requires` keys in the provider schema are `null` until the operator fills account IDs, flagged explicitly in the output JSON.
- Human gate: each action files a `## HUMAN` review task on the source card (billing document's `TODO.md`), not on a separate tracking card.
- Verification: `client-report` validated against `HCVP17072026002` — grep audit of the output found zero internal tokens (hash, `Bloco A/B`, ticket IDs, `Billing Ref`, hours real/estimated, `NE-2026` prefix, `estimativa/apurado`) absent; `financial-export` validated against `HCVI22052026001` — subtotal 2250 + IVA 23% = 2767.50 €, matching the fiscal total; `--provider sap` errors with `Available: moloni`.

---
