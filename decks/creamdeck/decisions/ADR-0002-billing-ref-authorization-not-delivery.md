# ADR-0002: `Billing Ref` proves authorization, not delivery — the invoice step is where delivery gets checked

**Date:** 2026-07-20
**Author:** Ruco
**Status:** Accepted

---

## Context

ADR-0001 added `Billing Ref` and `link-proposal-item`: a ticket can point at an approved proposal item's hash, proving which priced scope authorized its work. The action's own documented gate was always narrow — verify the item's hash is minted — but in practice, while populating a real client's board (`clients-hcv`), links were only ever created for tickets already `Resolved`/`Closed`, and one ticket (`HCV20072026003`, real, whose item's hash already existed) was deliberately left unlinked specifically because its own work hadn't happened yet.

That habit came from quietly treating `Billing Ref` as a stand-in for "this work is done and billable," which conflates two independent facts: whether a proposal item is *priced and approved*, and whether a *specific ticket's* work is *finished*. A proposal is, by definition, a pre-work document — its approval says the scope and price are locked, not that anything has been delivered. Nothing about `link-proposal-item`'s design ever required the ticket's own `Stage` to be Resolved before linking; that constraint existed only in how it was being used, never in what it was built to check.

The practical failure mode: a ticket that's clearly in-scope for a priced item (e.g. opened straight from a client request already covered by an approved proposal) had no way to record that fact until it was finished — losing, for the whole time it's in flight, any visibility into "what open work is this budget already covering."

## Decision

**We will** treat `Billing Ref` as a pure authorization link, checked and set independently of a ticket's `Stage`. `link-proposal-item` keeps its existing, only-ever-documented gate — the referenced item's hash must be minted — and nothing else; linking a ticket the moment it's opened, at 0 hours, is normal, not a shortcut.

Delivery status stays exactly where it already lived — the ticket's own `Stage` field — and is never inferred from `Billing Ref`'s presence.

The two combine at exactly one place: `generate-invoice`. Before including a hashed item on an invoice, check whether any ticket's `Billing Ref` points at it; if one does and that ticket isn't `Resolved`/`Closed`, surface it under `## HUMAN` instead of silently invoicing undelivered work. An item with no linked ticket at all is unaffected — linkage is optional per item, not a requirement to invoice (ad hoc lines and pre-creamdeck billing history, both already supported, never carry a ticket link at all).

## Rationale

This is a three-question model, and each question already has exactly one honest source of truth — the fix is refusing to let any one of them stand in for another:

- **Priced and approved?** → the item's hash exists (`mark-approved` has run).
- **Work done?** → the ticket's `Stage` (Resolved/Closed) — unrelated to billing, always was.
- **Safe to invoice?** → requires *both*, checked once, at the one step that actually emits a billing document.

Moving the delivery check to `generate-invoice` instead of `link-proposal-item` doesn't add a new check — `generate-invoice` never had *any* cross-check against ticket status before this, despite being the step that actually turns priced scope into a billing document. That's the real gap this ADR closes; loosening when `link-proposal-item` can run is a consequence of correctly locating where the check belongs, not a separate relaxation.

### Pros

- A ticket can carry its authorized billing scope from the moment it's opened — "what's this budget already covering, in flight or not" becomes answerable by reading `Billing Ref` across open + closed tickets together, not just closed ones
- The one place that actually needs the delivery guarantee (`generate-invoice`) is also the only place that now checks for it — closing a real gap, not just moving one
- No field, script, or file changes — `approve-proposal.js` and `export-invoice.js` are untouched; this is a documentation correction of `AGENT.md`/`AGENT-section.md` plus a clarified `generate-invoice` step

### Cons

- `Billing Ref` alone no longer tells a reader "this is billable right now" — they must also check `Stage`, two fields instead of one
- The invoice-time check is agent-performed prose guidance (`generate-invoice` has no dedicated script), not a deterministic script assertion like hash-minting — it can be missed by an agent playing the card carelessly, the same limitation every other agent-performed creamdeck action already has

## Alternatives Considered

### Option A: Keep requiring Stage = Resolved/Closed before linking

**Description:** Formalize the session's actual practice — document that `link-proposal-item` should refuse to run, or at least warn, unless the ticket's own `Stage` is Resolved or Closed.

**Pros:** `Billing Ref` presence alone stays a reliable "this is done and billable" signal; no second field to check.

**Cons:** Blocks the one thing this ADR is for — recording authorized-but-in-flight scope. A ticket opened directly against a known, approved budget line has no way to show that until finished, so nothing on the board distinguishes "in-flight, already covered" from "not yet scoped at all."

**Why rejected:** It optimizes for a reading convenience (one field tells the whole story) at the cost of the actual thing `Billing Ref` is supposed to prove — authorization, which is a pre-work fact by definition.

### Option B: Add a second field (e.g. `Delivered`) instead of relying on `Stage`

**Description:** Introduce an explicit `Delivered: yes/no` field on `TICKET.md`, separate from both `Stage` and `Billing Ref`, as the thing `generate-invoice` checks.

**Pros:** Makes the delivery signal explicit and billing-specific, decoupled from however `Stage`'s pipeline evolves.

**Cons:** `Stage` already answers "is the work done" (Resolved/Closed) for every ticket on the board, billable or not — a second field duplicates that, and the two could drift (a ticket marked `Delivered: yes` while `Stage` still says `Open`).

**Why rejected:** No evidence `Stage` is insufficient — it already is the delivery signal, for every ticket, billing-related or not. Duplicating it invites exactly the kind of drift this ADR is trying to remove.

## Consequences

### Positive

- `HCV20072026003` (real ticket, `clients-hcv`), whose item was approved but whose own work hadn't started, can now be linked immediately rather than waiting
- Future tickets opened directly against an already-approved proposal item can be linked at creation, not retrofitted after the fact
- `generate-invoice` gets a real, previously-missing safety check against invoicing undelivered work

### Negative

- Anyone reading a `Billing Ref` cold now needs to also check `Stage` to know if it's actually billable — one more thing `AGENT.md` has to carry, since the field alone no longer implies it

### Risks

- `generate-invoice`'s new check is prose guidance for the agent performing the action, not a script assertion — if `apply-actions.js`-style automation ever wraps invoice generation, this check needs to move into real code rather than staying documentation-only
- If a client board's convention (like `clients-hcv`'s, per its own tickets/TODO.md log) already treats `Resolved` tickets as archival-equivalent to `Closed`, the "must be Resolved or Closed" check at invoice time still holds — this ADR doesn't touch that separate, already-known documentation/practice drift

## Implementation Notes

- `decks/creamdeck/AGENT.md` — "Billing lifecycle" step 4 (Invoice) gains the pre-invoice linked-ticket check; step 6 (Ticket linkage) states the Stage-independence explicitly; new "Authorization vs. delivery vs. invoicing" paragraph names the three-question model
- `decks/creamdeck/AGENT-section.md` — condensed version of the same paragraph
- No changes to `energy-cards/*.template`, `scripts/approve-proposal.js`, `scripts/export-invoice.js`, or any blueprint — this is a semantics correction to already-shipped fields/actions, not new surface
- `manifest.json` bumped `0.8.0` → `0.8.1` (documentation/behavior clarification, no new files)
- Not retroactively rewritten: this ADR doesn't touch how `clients-hcv` or any other live instance already used `Billing Ref` this session — those links remain valid under the new reading (an approved-and-done ticket is still exactly as billable as before); it only unblocks linking tickets that aren't done yet, going forward

---
