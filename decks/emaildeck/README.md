# emaildeck

Gmail filter rules as flowdeck cards — fetch, label, and route findings to
crunchdeck; filters run via a deterministic `_scripts/emaildeck_run.js`
runner. Recurring inboxing lives at the `mail-inbox/` folder card
(`recurrence: daily`, cron-able), which bulk-executes activated cards inline
while dormant menus stay quarantined. An on-demand `emaildeck-digest` ritual
distils unread newsletters into dated `_digests/` docs.

## Install

```bash
flowdeck install emaildeck --local
```

Installs into `.flowdeck/.emaildeck/` and plays `emaildeck-init` to scaffold
structure (replay = install-repair); `emaildeck-setup` establishes filters and
runs the first backfill, played on demand:

```bash
flowdeck play .emaildeck/_sleeve/emaildeck-init
flowdeck play .emaildeck/_sleeve/emaildeck-setup
```

## Blueprints

- `emaildeck-add-filter` — add a new Gmail filter rule
- `emaildeck-compose` — draft an outgoing email
- `emaildeck-backfill-bodies` — fetch full bodies for already-fetched messages
- `emaildeck-digest` — summarise unread newsletters into a dated digest

Full reference: [AGENT.md](AGENT.md).
