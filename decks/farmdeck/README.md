# farmdeck

Prospection pipeline — track contacts through Seed → Nurture → Active → Won /
Dropped. Programmatic intake via `flowdeck create-card` (CLI-001).

## Install

```bash
flowdeck install farmdeck --local
```

Installs into `.flowdeck/.farmdeck/` and plays `farmdeck-init` to scaffold the
inbox, prospects, won, dropped, and pipeline cards. Replay anytime as an
install-repair:

```bash
flowdeck play .farmdeck/_sleeve/farmdeck-init
```

## Blueprints

- `farmdeck-add-prospect` — add a new prospect directly to the pipeline

Full reference: [AGENT.md](AGENT.md).
