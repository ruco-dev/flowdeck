# notedeck

The `.flowdeck/.notedeck/` directory holds freeform notes as flowdeck cards. Use it for research, meeting notes, drafts, or any unstructured content that benefits from being tracked alongside project work.

**Blueprints (mortal templates — each play mints a new meldable card):**

None. notedeck ships no true-template blueprints.

**Sleeve residents & `sleeveCards`:**

The manifest's `sleeveCards` field lists exactly one card: `notedeck-init`. It is a **ritual** (`lifecycle: ritual`, `recurrence: on-demand`): `flowdeck install notedeck` copies it into the deck's own `_sleeve/` (`.flowdeck/.notedeck/_sleeve/`) and plays it in place; replaying it is `flowdeck install notedeck --repair` (every step create-if-missing). It is never melded.

`sleeveCards` holds **no operational instruments** — notedeck packages no folder-scoped instrument cards; the `.flowdeck/.notedeck/` directory is a plain notes area with no recurring per-folder logic to run. A deck whose init is its only sleeve resident is the common case (see emaildeck's own AGENT.md).
