# gitdeck

GitHub repo vigilance — watches owned, competitor, provider, consumer, and
benchmark repos; routes findings to crunchdeck.

## Install

```bash
flowdeck install gitdeck --local
```

Installs into `.flowdeck/.gitdeck/` and plays `gitdeck-init` to scaffold the
watched-repos tree. Ships no folder-scoped instruments beyond init. Replay
anytime as an install-repair:

```bash
flowdeck play .gitdeck/_sleeve/gitdeck-init
```

## Blueprints

- `gitdeck-add-repo` — add a repo to watch

Full reference: [AGENT.md](AGENT.md).
