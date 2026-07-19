# flowdeck

Human↔AI collaboration via TODO.md and git. Cards split into `## BOT` / `## HUMAN` sections. `play <card>` runs one; `turn` passes the full deck to Claude for assessment and execution.

This repo is the **public deck library** — installable domain-specific card collections. The CLI is published on npm as [`flowdeck`](https://www.npmjs.com/package/flowdeck) (its source repo is private).

## Decks

See [DECKS.md](DECKS.md) for the full registry, install instructions, and contribution guide.

| Deck | Description |
|---|---|
| [`crunchdeck`](decks/crunchdeck/) | Product management — backlog, roadmap, ADR, inbox |
| [`emaildeck`](decks/emaildeck/) | Gmail as flowdeck cards — a deterministic filter/fetch runner (one card per message) plus a compose → push → sent outbound draft lifecycle |
| [`gitdeck`](decks/gitdeck/) | GitHub repo vigilance — owned, competitor, provider repos |
| [`webdeck`](decks/webdeck/) | Web search signals routed to crunchdeck |
| [`notedeck`](decks/notedeck/) | Freeform notes as flowdeck cards |
| [`creamdeck`](decks/creamdeck/) | Project-scoped CRM — contacts, unified inbox, a ticket pipeline with report exports, `add-meeting` scheduling into calendardeck, and a proposal → request note → invoice billing chain with per-item approval hashes |
| [`calendardeck`](decks/calendardeck/) | Google Calendar events as flowdeck cards, with a token → MCP → ICS sync fallback and a flat quick-event convention |
| [`farmdeck`](decks/farmdeck/) | Prospection pipeline — Seed → Nurture → Active → Won |

## Install a deck

```bash
npm i -g flowdeck
flowdeck install <deck-name> --local
```

## Contributing

See [DECKS.md](DECKS.md) for the contribution guide. Deck sources are checked
mechanically — run `node tools/decks-lint.mjs` before opening a PR; CI runs it on every
push and pull request.

After cloning, run `git config core.hooksPath tools/hooks` once to enable the local
pre-commit guard against leaking absolute local paths into tracked config.
