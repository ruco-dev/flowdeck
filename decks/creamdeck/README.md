# creamdeck

Project-scoped CRM — contacts, a unified email/call inbox, and a ticket
pipeline with `REPORT.md` + static HTML report exports; tickets can spawn a
calendardeck meeting via `add-meeting`. Also a proposal → request note →
invoice billing chain — approving a proposal mints a per-item hash
(`approve-proposal.js`) that a ticket's `Billing Ref` can point to; invoices
export a provider-agnostic `invoice-export.json` (`export-invoice.js`) for a
future financial-app connector.

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
