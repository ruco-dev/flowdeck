## webdeck

The `.flowdeck/.webdeck/` directory runs web searches on a configured set of queries and routes findings to crunchdeck. Queries are grouped by intent — category, competitor, user pain, trends — and each search pass generates finding cards.

**Standing cards (created by `webdeck-init`):**
- `.flowdeck/.webdeck/queries/` — `TODO.md` — orchestrates all configured query cards

**Created per-instance:**
- `.flowdeck/.webdeck/queries/<slug>/` — `QUERY.md` + `TODO.md` — search terms, intent, run log, findings

**Pipeline:** Web search queries → finding cards → `send-to-crunchdeck` → crunchdeck inbox

**To run all queries**, play `.flowdeck/.webdeck/queries/`.

**Blueprints (mortal templates — each play mints a new meldable card):**
- `webdeck-add-query` — configure a new search query

**Sleeve residents & `sleeveCards`:**

The manifest's `sleeveCards` field lists exactly one card: `webdeck-init`. It is a **ritual** (`lifecycle: ritual`, `recurrence: on-demand`): `flowdeck install webdeck` copies it into the deck's own `_sleeve/` (`.flowdeck/.webdeck/_sleeve/`) and plays it in place; replaying it is `flowdeck install webdeck --repair` (every step create-if-missing). It is never melded.

`sleeveCards` holds no operational instruments beyond init — webdeck ships no folder-scoped instrument cards of its own (the `queries/TODO.md` orchestrator is scaffolded by init inline, not shipped as a separate blueprint or sleeve resident). the board's root `_sleeve/` is reserved for project-generic / cross-cutting instruments; a deck's own `_sleeve/` holds its rituals (e.g. the default `release` card); webdeck adds none. A deck whose init is its only sleeve resident is the common case, per emaildeck's own AGENT.md note.
