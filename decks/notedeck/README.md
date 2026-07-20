# notedeck

Freeform notes as flowdeck cards under `.flowdeck/.notedeck/`.

## Install

```bash
flowdeck install notedeck --local
```

Installs into `.flowdeck/.notedeck/` and plays `notedeck-init` to scaffold the
notes tree. Packages no true-template blueprints — notes are created directly.
Replay anytime as an install-repair:

```bash
flowdeck play .notedeck/_sleeve/notedeck-init
```

Full reference: [AGENT.md](AGENT.md).
