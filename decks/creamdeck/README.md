# creamdeck

Project-scoped CRM — contacts, a unified email/call inbox, and a ticket
pipeline with `REPORT.md` + static HTML report exports; tickets can spawn a
calendardeck meeting via `add-meeting`. Closing a ticket to Closed (not
Resolved) archives it to `closed-tickets/` — moved, not deleted, and still
counted in reports; `reopen` brings one back. Also a proposal → request note →
invoice billing chain — approving a proposal mints a per-item hash
(`approve-proposal.js`) that a ticket's `Billing Ref` can point to at any
Stage, since it proves authorization, not delivery; invoices export a
provider-agnostic `invoice-export.json` (`export-invoice.js`) for a future
financial-app connector, checking first that any linked ticket is actually
Resolved/Closed.

Any billing document can also produce **client-facing exports** (all draft-not-send):
a client-safe `client-report.html` (`client-report.js` — a whitelist projection
that never reads the internal Hash column / Notes / Updates), a Moloni **proforma**
+ import payload for invoices (`moloni-export.js`; the certified invoice is still
issued by Moloni), and a cover email drafted from the document. Full action
reference: [ACTIONS.md](ACTIONS.md).

## Install

```bash
flowdeck install creamdeck --local
```

Installs into `.flowdeck/.creamdeck/` and plays `creamdeck-init` to scaffold
the inbox, contacts, tickets, and billing document trees. Replay anytime as an
install-repair:

```bash
flowdeck play .creamdeck/_sleeve/creamdeck-init
```

## Blueprints

- `creamdeck-add-contact` — create a new contact card directly
- `creamdeck-open-ticket` — open a new support/project ticket
- `creamdeck-new-proposal` — draft a priced proposal; request notes and
  invoices are always generated downstream, never opened cold

Full reference: [AGENT.md](AGENT.md).
