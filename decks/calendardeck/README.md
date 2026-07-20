# calendardeck

Google Calendar events as flowdeck cards — one-way sync (GCal → local, with a
token → MCP → ICS fallback chain) over browser-OAuth REST v3. Per-day, week,
month, and year cards; day-scoped `sync-day` re-fetch with idempotent
meeting-notes injection; a flat `_events/` convention for ad-hoc quick events;
an optional public ICS source and a `send-to-gcal` action for pushing tasks
back.

## Install

```bash
flowdeck install calendardeck --local
```

Installs into `.flowdeck/.calendardeck/` and plays `calendardeck-init` to
scaffold the sync tree and per-period cards. Replay anytime as an
install-repair:

```bash
flowdeck play .calendardeck/_sleeve/calendardeck-init
```

## Blueprints

No configurable-item blueprints — the whole-tree sync lives as a root-level
recurring folder card at `.calendardeck/TODO.md`, scaffolded by init.

Full reference: [AGENT.md](AGENT.md).
