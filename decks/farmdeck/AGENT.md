# farmdeck

The `.flowdeck/.farmdeck/` directory is a prospection pipeline deck. It tracks individual contacts (prospects) through a Seed → Nurture → Active → Won / Dropped funnel.

---

## Pipeline Stages

| Stage | Meaning |
|---|---|
| Seed | Identified — no meaningful contact yet |
| Nurture | Engaged — active conversation or drip in progress |
| Active | Qualified — evaluating or in proposal stage |
| Won | Closed successfully |
| Dropped | Disqualified or abandoned |

Stage definitions and stale thresholds are in `PIPELINE.md`.

---

## Directory Layout

```
.flowdeck/.farmdeck/
  README.md
  pipeline/
    PIPELINE.md                ← stage config and stale thresholds
    TODO.md                    ← standing pipeline overview card
  farmdeck-inbox/
    INBOX.md                   ← auto-updated leads index
    TODO.md                    ← standing inbox card — review and route leads
    <slug>/                    ← unqualified lead (PROSPECT.md, INTERACTIONS.md, TODO.md)
  prospects/
    PROSPECTS.md               ← auto-updated prospects index
    TODO.md                    ← standing prospects card — overview, triage, add
    <slug>/
      PROSPECT.md              ← data companion: name, email, company, stage, source, score
      INTERACTIONS.md          ← chronological interaction log
      TODO.md                  ← active tasks + ACTIONS
  won/
    WON.md                     ← auto-updated won deals index
    TODO.md                    ← standing won card — archive overview, re-engage
    <slug>/                    ← archived won prospect (moved, not deleted)
  dropped/
    DROPPED.md                 ← auto-updated dropped prospects index
    TODO.md                    ← standing dropped card — archive overview, re-engage
    <slug>/                    ← archived dropped prospect (moved, not deleted)
```

---

## Inbox

Raw and unqualified leads land in `farmdeck-inbox/` — from manual entry, programmatic intake, or forwards from other decks (emaildeck, crunchdeck). Each inbox entry has the same structure as a prospect card (`PROSPECT.md`, `INTERACTIONS.md`, `TODO.md`) but is not yet part of the active pipeline.

Play `farmdeck-inbox/TODO.md` to review and route leads. From there, the `qualify` action promotes a lead into `prospects/` (Stage → Seed), and `drop` archives it in `dropped/`.

---

## Card Anatomy

Each prospect card folder contains:
- **`PROSPECT.md`** — structured data (stage, contact info, source, score). Edited by bot actions; do not edit the stage field manually — use `advance-stage` or `drop` instead.
- **`INTERACTIONS.md`** — append-only log of every interaction (date, type, notes).
- **`TODO.md`** — active tasks and ACTIONS. Safe to edit freely.

---

## Actions

These appear in `## ACTIONS` of every prospect card. Move one to `## BOT` and play the card to activate it.

| Action | What it does |
|---|---|
| `qualify` | Moves a lead from `farmdeck-inbox/<slug>/` to `prospects/<slug>/`; sets Stage to Seed |
| `log-interaction` | Appends an entry to `INTERACTIONS.md` — type, date, notes from task line |
| `advance-stage` | Promotes prospect to the next stage; updates stage field in `PROSPECT.md` |
| `drop` | Moves the card folder to `dropped/<slug>/`; updates stage to Dropped |
| `win` | Moves the card folder to `won/<slug>/`; updates stage to Won |
| `draft-email` | Creates a Gmail draft via emaildeck for this prospect |
| `send-to-crunchdeck` | Routes a signal or insight to `.crunchdeck/crunchdeck-inbox/` |

---

## Programmatic Intake

Prospects can be created programmatically via `flowdeck create-card`:

```bash
flowdeck create-card farmdeck <column> <slug> --data '{"name":"...", "email":"...", "stage":"seed"}'
```

Both paths are available: `flowdeck create-card` for programmatic intake, `farmdeck-add-prospect` blueprint for manual intake.

---

## Suppression-List Pattern

A **suppression list** deduplicates prospects across programmatic intake runs. Create a `farmdeck-inbox/CONTACTED.md` energy card listing source URLs (or other identifiers) of prospects already contacted or processed. Before creating cards programmatically, check this list to avoid duplicate intake of the same source.

Structure:

```markdown
# farmdeck-inbox — Contacted Sources

Last updated: <date>

## Contacted

- <source-url-or-id>
- <source-url-or-id>
```

Maintain this list manually or as part of a programmatic intake pipeline — whenever a source is processed, add it to `CONTACTED`. Future runs check this list before creating a new card.

---

## Batch-Operations Pattern

The **_TODROP/** pattern handles bulk card processing. When a programmatic script needs to process multiple prospects in parallel (drop, qualify, or score them), drop the card folders into a temporary `farmdeck-inbox/_TODROP/` subdirectory. Then create a single inbox card whose BOT task describes the batch action:

```markdown
# farmdeck-inbox — Batch Process

## BOT

- [ ] Execute the action described for each card in `_TODROP/`:
  - move `<slug>/` to `dropped/` and set Stage to Dropped
  - OR: move `<slug>/` to `prospects/` and set Stage to Seed
  - OR: update `INTERACTIONS.md` with a note and bump score

  → for each $card in _TODROP: [action]
```

After the batch action completes, remove the `_TODROP/` folder. This pattern isolates programmatic work from the live inbox, allowing the model to review and execute all changes atomically.

---

## Hash-Suffixed Slug Convention

Programmatic intake generates collision-safe card slugs by appending a 7-character hash: `<slug>-<hash>`. For example, a prospect named "acme-corp" might be created as `acme-corp-3f7a2k1`. This prevents name collisions when the same prospect is discovered through different sources or in rapid succession.

Usage in `flowdeck create-card`:

```bash
slug="acme-corp-$(openssl rand -hex 3 | cut -c1-7)"
flowdeck create-card farmdeck farmdeck-inbox "$slug" --data '{"name":"Acme Corp","email":"...","stage":"seed"}'
```

New programmatic intakes should use this convention; existing cards without hashes do not need retroactive updates.

---

## Instrument cards (folder cards — scaffolded by `farmdeck-init`, played in place, never melded)

Each operational folder carries its own `TODO.md` with `lifecycle: recurring` frontmatter. Per the folder-is-card rule (sleeve `SPEC.md`), these live on the folder they act on — they are **not** `_sleeve/` residents and **not** blueprints. Play one with `flowdeck play .farmdeck/<area>` or in place; a play resets its `## BOT` checkboxes for the next run, and the `.*` `.flowdeckignore` rule keeps them out of `flowdeck turn` sweeps.

- `.flowdeck/.farmdeck/farmdeck-inbox/TODO.md` — list unqualified leads, rewrite `INBOX.md`, surface each lead for `qualify` / `drop`
- `.flowdeck/.farmdeck/prospects/TODO.md` — scan active prospects, group by stage, flag stale ones, rewrite `PROSPECTS.md`
- `.flowdeck/.farmdeck/won/TODO.md` — list closed deals, rewrite `WON.md`
- `.flowdeck/.farmdeck/dropped/TODO.md` — list dropped prospects, rewrite `DROPPED.md`
- `.flowdeck/.farmdeck/pipeline/TODO.md` — read `PIPELINE.md` stage config, scan prospects, surface a pipeline summary and needs-attention list

**Blueprints (mortal templates — each play mints a new meldable card):**
- `farmdeck-add-prospect` — create a new prospect card from `## HUMAN` input

**Sleeve residents & `sleeveCards`:**

The manifest's `sleeveCards` field lists exactly one card: `farmdeck-init`. It is a **ritual** (`lifecycle: ritual`, `recurrence: on-demand`): `flowdeck install farmdeck` copies it into the deck's own `_sleeve/` (`.flowdeck/.farmdeck/_sleeve/`) and plays it in place; replaying it is `flowdeck install farmdeck --repair` (every step create-if-missing). It is never melded.

`sleeveCards` holds **no operational instruments** — every farmdeck instrument (inbox / prospects / won / dropped / pipeline) is folder-scoped and therefore a folder card under `.farmdeck/`, not a sleeve resident.
