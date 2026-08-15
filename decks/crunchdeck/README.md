# crunchdeck

Product management — `PROFILE`, `BACKLOG`, `ROADMAP`, `ADR`, and an inbox
under `.flowdeck/.crunchdeck/`. A second sleeve ritual,
`publish-readiness-audit`, runs a read-only pre-flight before each release
(registry identity, tarball truth, git hygiene, docs drift, deck state, CI,
build smoke) and mints a `prepare-to-publish` folder card, handing off to
`launches/` on a READY verdict. A third, `publish-vuln-audit`, runs first and
audits dependency vulnerabilities in what actually ships — read-only by
default, with a bounded lockfile-only `npm audit fix` (never `--force`, tests
must pass, reverts otherwise) and a hard stop to `## HUMAN` for anything
riskier. Its verdict mints a `security-findings` folder card, and
`publish-readiness-audit` gates on that run being fresher than the lockfile.

## Install

```bash
flowdeck install crunchdeck --local
```

Installs into `.flowdeck/.crunchdeck/` and plays `crunchdeck-init` to
scaffold the inbox, profile, backlog, roadmap, stats, and launches cards.
Replay anytime as an install-repair:

```bash
flowdeck play .crunchdeck/_sleeve/crunchdeck-init
```

## Blueprints

- `crunchdeck-adr` — record an architecture decision
- `crunchdeck-promote` — promote a backlog item toward the roadmap

Full reference: [AGENT.md](AGENT.md).
