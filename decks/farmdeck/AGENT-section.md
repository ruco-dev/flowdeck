## farmdeck

The `.flowdeck/.farmdeck/` directory is a prospection pipeline deck. Tracks contacts through Seed → Nurture → Active → Won / Dropped.

**Layout:** `PIPELINE.md` (stage config) · `pipeline/TODO.md` (standing overview card) · `prospects/<slug>/` (PROSPECT.md + INTERACTIONS.md + TODO.md) · `won/` · `dropped/`

**Actions per prospect card:** `log-interaction`, `advance-stage`, `drop`, `win`, `draft-email`, `send-to-crunchdeck`. Move to `## BOT` to activate.

**Programmatic intake:** `flowdeck create-card farmdeck <column> <slug> --data '{...}'`

**Instrument cards (folder cards, played in place):** `farmdeck-inbox/`, `prospects/`, `won/`, `dropped/`, `pipeline/` — each carries its own `TODO.md`, scaffolded by `farmdeck-init`.

**Blueprints:**
- `farmdeck-add-prospect` — create a prospect card from `## HUMAN` input

**Sleeve residents (`sleeveCards`):**
- `farmdeck-init` — ritual; `flowdeck install farmdeck --repair` to replay
