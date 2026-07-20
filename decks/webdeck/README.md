# webdeck

Web search signals — runs configured queries and routes findings to
crunchdeck.

## Install

```bash
flowdeck install webdeck --local
```

Installs into `.flowdeck/.webdeck/` and plays `webdeck-init` to scaffold the
queries tree. Ships no folder-scoped instruments beyond init. Replay anytime
as an install-repair:

```bash
flowdeck play .webdeck/_sleeve/webdeck-init
```

## Blueprints

- `webdeck-add-query` — add a new search query to run

Full reference: [AGENT.md](AGENT.md).
