## gitdeck

The `.flowdeck/.gitdeck/` directory watches GitHub repositories for signal. Repos are grouped by category — owned, competitor, provider, consumer, benchmark — and each watch pass generates finding cards routed to crunchdeck.

**Standing cards (created by `gitdeck-init`):**
- `.flowdeck/.gitdeck/repos/` — `TODO.md` — orchestrates all configured repo cards

**Created per-instance:**
- `.flowdeck/.gitdeck/repos/<owner>-<repo>/` — `REPO.md` + `TODO.md` — watch config, run log, findings

**Pipeline:** GitHub repos → finding cards → `send-to-crunchdeck` → crunchdeck inbox

**To watch all repos**, play `.flowdeck/.gitdeck/repos/`.

**Blueprints (mortal templates — each play mints a new meldable card):**
- `gitdeck-add-repo` — configure a new repo to watch

**Sleeve residents & `sleeveCards`:**

The manifest's `sleeveCards` field lists exactly one card: `gitdeck-init`. It is a **ritual** (`lifecycle: ritual`, `recurrence: on-demand`): `flowdeck install gitdeck` copies it into the deck's own `_sleeve/` (`.flowdeck/.gitdeck/_sleeve/`) and plays it in place; replaying it is `flowdeck install gitdeck --repair` (every step create-if-missing). It is never melded.

gitdeck ships no folder-scoped operational instruments beyond init — `repos/TODO.md` (the orchestrator that sweeps all repo cards) is scaffolded by `gitdeck-init` itself and stays inline rather than becoming a separate folder card. A deck whose init is its only sleeve resident is the common case (see emaildeck's `AGENT.md`).
