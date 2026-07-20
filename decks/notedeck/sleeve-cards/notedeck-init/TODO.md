---
lifecycle: ritual
recurrence: on-demand
---

# notedeck-init

> **Sleeve resident.** This is a ritual card: it lives in the deck's own `_sleeve/` (`.flowdeck/.notedeck/_sleeve/`), is played in place, and is never melded. Replaying it **is** `flowdeck install notedeck --repair` — every step is create-if-missing, so a re-play converges the working tree without clobbering local tuning.

## BOT

- [ ] This card is idempotent — do not stop early if `.flowdeck/.notedeck/` already exists. Create each path only if missing; skip silently otherwise:
  - `.flowdeck/.notedeck/`

- [ ] Read `FLOWDECK.md` for project name. Fall back to `package.json` name if not found.

- [ ] Add `.*` to `.flowdeck/.flowdeckignore` if not already present.

- [ ] Scaffold `.flowdeck/.notedeck/README.md` from `_energy-cards/README.md.template`. Repair-safe: create it if missing; if it exists, regenerate it from the current template and refresh the stamp — unless a `.flowdeck/.notedeck/.readme-hash` stamp already exists and no longer matches the file's current content (real evidence of a hand-edit since the last generation; a *missing* stamp is not such evidence and must not block regeneration). In that hand-edited case, leave it alone and note under `## HUMAN` that it's locally customized and may be out of sync. Write/refresh `.flowdeck/.notedeck/.readme-hash` (sha256 of the file) after writing or confirming it.

- [ ] Scaffold `.flowdeck/.notedeck/AGENT.md` if it does not already exist:
  ```markdown
  # notedeck

  The `.flowdeck/.notedeck/` directory holds freeform notes as flowdeck cards. Use it for research, meeting notes, drafts, or any unstructured content that benefits from being tracked alongside project work.

  **Blueprint:**
  - `notedeck-init` — scaffold `.flowdeck/.notedeck/` in this project
  ```

- [ ] Commit **only if this replay changed anything** (a repair replay on an already-scaffolded project produces no diff): `git add .flowdeck/.notedeck && git diff --cached --quiet || git commit -m "deck: init notedeck"`.

## HUMAN

#### COMMENTS
