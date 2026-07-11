## crunchdeck

The `.flowdeck/.crunchdeck/` directory is a product management deck. Each asset is a card — a folder with a document and a `TODO.md` that drives work on it.

**Standing cards (created by `crunchdeck-init`):**
- `.flowdeck/.crunchdeck/crunchdeck-inbox/` — `TODO.md` — finding cards forwarded from emaildeck / gitdeck / webdeck, awaiting routing
- `.flowdeck/.crunchdeck/profile/` — `PROFILE.md` + `TODO.md` — product identity: one-liner, elevator pitch, north-star, market lane
- `.flowdeck/.crunchdeck/backlog/` — `BACKLOG.md` + `TODO.md` — candidate items promoted from inbox
- `.flowdeck/.crunchdeck/roadmap/` — `ROADMAP.md` + `TODO.md` — committed themes by horizon (Now / Next / Later)
- `.flowdeck/.crunchdeck/launches/` — `TODO.md` — recurring release pipeline (`<!-- lifecycle: recurring -->`); auto-resets after each play, never melds

**Created per-instance:**
- `.flowdeck/.crunchdeck/_decisions/ADR-XXXX/` — `ADR-XXXX.md` + `TODO.md` — architectural and product decisions
- `.flowdeck/.crunchdeck/launches/vX.Y.Z/` — `LAUNCH.md` + `TODO.md` — per-launch operational checklists (created by the launches pipeline card)
- `.flowdeck/.crunchdeck/prepare-to-publish/` — `AUDIT.md` + `TODO.md` — publish blockers as bot/human fix tasks (minted by the `publish-readiness-audit` sleeve ritual)

**Sleeve rituals (in `.flowdeck/.crunchdeck/_sleeve/`, played in place, never melded):**
- `crunchdeck-init` — install/repair scaffold; replay converges the working tree
- `publish-readiness-audit` — read-only pre-flight before going public: registry identity, tarball truth, git hygiene, docs drift, deck state (incl. the card-sending inbox gate — the board-level `_inbox/` must hold no unmelded received cards, `flowdeck inbox --gate`), CI, build smoke. Findings mint/refresh the `prepare-to-publish` folder card (`AUDIT.md` + bot/human fix tasks); READY verdict hands off to `launches/`. Play before every release

**Pipeline:** emaildeck / gitdeck / webdeck (`send-to-crunchdeck`) → `crunchdeck-inbox/` → Backlog / Roadmap / Decision → flowdeck cards

**To play a crunchdeck card**, read the `TODO.md` in the relevant folder and execute its `## BOT` tasks, writing changes to the companion document in the same folder.

### Triggers

Act on these without waiting to be asked:

- **Architectural or product decision made** — open an ADR immediately: `flowdeck blueprint use crunchdeck-adr <slug>`, fill it with the decision, rationale, and rejected alternatives.
- **Release being prepared** — play `.flowdeck/.crunchdeck/launches/TODO.md`; it infers the version from untagged meld cards and scaffolds the launch folder.
- **Open question resolved into a significant choice** — if reversing it would cost meaningful time or money, it warrants an ADR.

Surface the created file path under `## HUMAN` so the human can review.

### Protocol: Undocumented Work

Before implementing any non-trivial change — new capability, changed behavior, user-visible fix, or architectural decision:

1. **Offer a card first**: "This looks like it warrants a flowdeck card — want me to create one before starting?"
2. **If declined**, implement the work.
3. **After implementation**, if no card was created: "I implemented this without a card. Want me to write and meld it now so it's tracked for the next release?" If yes, create the card with tasks pre-marked `[x]` and move it to `_meld/` with today's timestamp.

A change is non-trivial if it would appear in a CHANGELOG: new feature, changed behavior, fixed bug, or significant refactor. Small edits, typo fixes, and config tweaks do not need cards.
