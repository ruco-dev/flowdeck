# crunchdeck

The `.flowdeck/.crunchdeck/` directory is a product management deck. Each asset is a card — a folder with a document and a `TODO.md` that drives work on it.

**Created per-instance:**
- `.flowdeck/.crunchdeck/_decisions/ADR-XXXX/` — `ADR-XXXX.md` + `TODO.md` — architectural and product decisions
- `.flowdeck/.crunchdeck/launches/vX.Y.Z/` — `LAUNCH.md` + `TODO.md` — per-launch operational checklists (created by the launches folder card)
- `.flowdeck/.crunchdeck/prepare-to-publish/` — `AUDIT.md` + `TODO.md` — publish blockers as bot/human fix tasks (minted by the `publish-readiness-audit` sleeve ritual)

**Pipeline:** emaildeck / gitdeck / webdeck (`send-to-crunchdeck`) → `crunchdeck-inbox/` → Backlog / Roadmap / Decision → flowdeck cards

**To play a crunchdeck card**, read the `TODO.md` in the relevant folder and execute its `## BOT` tasks, writing changes to the companion document in the same folder.

**Instrument cards (folder cards — scaffolded by `crunchdeck-init`, played in place, never melded):**

Each operational folder carries its own `TODO.md` with `lifecycle: recurring` frontmatter. Per the folder-is-card rule (sleeve `SPEC.md`), these live on the folder they act on — they are **not** `_sleeve/` residents and **not** blueprints. Play one with `flowdeck play .crunchdeck/<area>` or in place; a play resets its `## BOT` checkboxes for the next run, and the `.*` `.flowdeckignore` rule keeps them out of `flowdeck turn` sweeps.

- `.flowdeck/.crunchdeck/crunchdeck-inbox/TODO.md` — finding cards forwarded from emaildeck / gitdeck / webdeck, awaiting routing
- `.flowdeck/.crunchdeck/profile/TODO.md` — product identity: one-liner, elevator pitch, north-star, market lane
- `.flowdeck/.crunchdeck/backlog/TODO.md` — candidate items promoted from inbox
- `.flowdeck/.crunchdeck/roadmap/TODO.md` — committed themes by horizon (Now / Next / Later)
- `.flowdeck/.crunchdeck/stats/TODO.md` — npm + GitHub package stats dashboard
- `.flowdeck/.crunchdeck/launches/TODO.md` — full release pipeline (version bump, CHANGELOG, launch record, ship, close out); scaffolds `launches/vX.Y.Z/`

**Blueprints (mortal templates — each play mints a new meldable card):**
- `crunchdeck-adr` — open a new ADR in `_decisions/`
- `crunchdeck-promote` — promote backlog candidates (P0/P1) into the roadmap

**Sleeve residents & `sleeveCards`:**

The manifest's `sleeveCards` field lists two cards, both **rituals** (`lifecycle: ritual`, `recurrence: on-demand`) copied into the deck's own `_sleeve/` (`.flowdeck/.crunchdeck/_sleeve/`) by `flowdeck install crunchdeck`, played in place, never melded:

- `crunchdeck-init` — replaying it is `flowdeck install crunchdeck --repair` (every step create-if-missing).
- `publish-readiness-audit` — read-only pre-flight for going public: identity (registry twins, scoped-vs-unscoped), tarball truth (`npm pack --dry-run` vs README promises and internal leaks), git hygiene (unpushed commits, private-content sweep, tracked-vs-ignored contradictions), docs drift (README vs entry-point code), deck state (false-completion check on publish-prep cards + the card-sending inbox gate: `flowdeck inbox --gate` must be empty of unmelded received cards, since a `done-report` describes work that belongs in this release's notes — see repo-root `CARD-SENDING.md`), platform/CI, build smoke. The verdict materializes as a `prepare-to-publish` folder card (`AUDIT.md` report + `TODO.md` of bot/human fix tasks); a READY verdict hands off to the `launches/` pipeline. Play it before every release.

`sleeveCards` holds **no operational instruments** — every crunchdeck instrument (inbox / profile / backlog / roadmap / stats / launches) is folder-scoped and therefore a folder card under `.crunchdeck/`, not a sleeve resident. the board's root `_sleeve/` is reserved for project-generic / cross-cutting instruments; a deck's own `_sleeve/` holds its rituals.

## Triggers

Act on these without waiting to be asked:

- **Architectural or product decision made** — open an ADR immediately: `flowdeck blueprint use crunchdeck-adr <slug>`, fill it with the decision, rationale, and rejected alternatives.
- **Release being prepared** — play the `publish-readiness-audit` sleeve ritual first; on a READY verdict, play `.flowdeck/.crunchdeck/launches/TODO.md` — it infers the version from untagged meld cards and scaffolds the launch folder.
- **Open question resolved into a significant choice** — if reversing it would cost meaningful time or money, it warrants an ADR.

Surface the created file path under `## HUMAN` so the human can review.

## Protocol: Undocumented Work

Before implementing any non-trivial change — new capability, changed behavior, user-visible fix, or architectural decision:

1. **Offer a card first**: "This looks like it warrants a flowdeck card — want me to create one before starting?"
2. **If declined**, implement the work.
3. **After implementation**, if no card was created: "I implemented this without a card. Want me to write and meld it now so it's tracked for the next release?" If yes, create the card with tasks pre-marked `[x]` and move it to `_meld/` with today's timestamp.

A change is non-trivial if it would appear in a CHANGELOG: new feature, changed behavior, fixed bug, or significant refactor. Small edits, typo fixes, and config tweaks do not need cards.
