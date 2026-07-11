# calendardeck

The `.flowdeck/.calendardeck/` directory holds Google Calendar events as flowdeck cards. Sync is one-way: GCal → local. The primary calendar is fetched via a three-tier fallback: the browser-OAuth `flowdeck auth google` token (REST v3, preferred — works headless/cron), then the MCP Google Calendar connector (only if the token fails), then a public ICS feed (last resort). An optional `Public Source` (a public GCal ID or `.ics` URL configured in `_sync/SYNC.md`) adds a second, always-ICS, read-only feed. Public events are read-only and are tagged "(public)" in event rows. To push a task back to Google Calendar, use the `send-to-gcal` action in any card.

---

## Slug Format

All slugs are unique — no full path needed to identify a card.

| Granularity | Slug format | Example | Week definition |
|---|---|---|---|
| Day | `YYYYMMDD` | `20260601` | — |
| Week | `YYYYMMWn` | `202606W1` | W1 = days 1–7, W2 = 8–14, W3 = 15–21, W4 = 22–28, W5 = 29–31 |
| Month | `YYYYMM` | `202606` | — |
| Year | `YYYY` | `2026` | — |

---

## Directory Layout

```
.flowdeck/.calendardeck/
  TODO.md                      ← standing sync card — play this to synchronize
  _sync/
    SYNC.md                    ← sync config: calendar ID, optional public source, default range, run log
  _events/                     ← flat, ad-hoc quick events (not synced from Google Calendar)
    2026-06-15-ticket-x-kickoff/
      EVENT.md                 ← Ticket / Contact / Date / Follow-up / Status + Notes
  README.md
  2026/                        ← year card
    SUMMARY.md
    TODO.md
    202606/                    ← month card (child of year)
      SUMMARY.md
      TODO.md
      202606W1/                ← week card (child of month, W1 = days 1–7)
        SUMMARY.md
        TODO.md
        20260601/              ← day card (child of week)
          EVENTS.md            ← synced event data (do not edit)
          TODO.md
        20260602/
          EVENTS.md
          TODO.md
      202606W2/
        ...
    202607/
      ...
```

---

## Card Anatomy

Every card has a `TODO.md` with `## BOT` / `## HUMAN` / `## ACTIONS` sections, plus a synced data companion (`EVENTS.md` for days, `SUMMARY.md` for week/month/year). The data companion is overwritten on every sync — do not add content to it. All notes and tasks belong in `TODO.md`.

---

## Quick Events

`.flowdeck/.calendardeck/_events/<YYYY-MM-DD>-<slug>/EVENT.md` is a flat sibling to the synced `YYYY/YYYYMM/YYYYMMWn/YYYYMMDD/` hierarchy, for ad-hoc, human-authored meetings that don't warrant walking the tree (e.g. "meeting next Tuesday about ticket X"). It is scaffolded from `EVENT.md.template` — a field table (Ticket / Contact / Date / Follow-up / Status) plus a freeform `## Notes` section — and is never touched by `sync`. `calendardeck-init` scaffolds an empty `_events/` directory by default.

**Ownership contract:** calendardeck owns this path and the `EVENT.md` shape. Other decks may write directly into it (see ADR-0003, `.flowdeck/.crunchdeck/_decisions/ADR-0003/`) — e.g. creamdeck's `add-meeting` ticket action populates one when a ticket needs a scheduled meeting. calendardeck itself has no `add-meeting` action or knowledge of who writes here; it only defines the contract.

---

## Actions

These actions appear in the `## ACTIONS` section of cards. Move an item to `## BOT` to activate it, then play the card.

### `send-to-gcal`

Creates a Google Calendar event from a task description. Format:

```
- [ ] send-to-gcal — [Title | date YYYY-MM-DD | HH:MM–HH:MM | optional description]
```

When `send-to-gcal` is in `## BOT`:
1. Parse title, date, start time, end time, and description from the task line.
2. Resolve the day card path from the date: compute `YYYYMMDD`, `YYYYMM`, and week slug `YYYYMMWn` (W1 = days 1–7, W2 = 8–14, W3 = 15–21, W4 = 22–28, W5 = 29–31). Locate `.flowdeck/.calendardeck/YYYY/YYYYMM/YYYYMMWn/YYYYMMDD/EVENTS.md` — scaffold the path and file if they don't exist.
3. Append the event as a row to `EVENTS.md`. If the file already has an events table, add a row; if not, create the table with header first. Row format: `| HH:MM–HH:MM | Title | — | — |`.
4. If a `flowdeck auth` token is present at `~/.config/flowdeck/tokens/google.json`, write the event back via the Google Calendar REST API: refresh the token if expired (see the `sync` card's token-refresh step), then `curl -s -X POST -H "Authorization: Bearer ACCESS_TOKEN" -H "Content-Type: application/json" "https://www.googleapis.com/calendar/v3/calendars/primary/events" -d '{"summary":"Title","start":{"dateTime":"...","timeZone":"..."},"end":{"dateTime":"...","timeZone":"..."},"description":"..."}'`. Capture the returned event `id`. Target a specific calendar by substituting its URL-encoded ID for `primary`.
5. Replace the task line with `- [x] sent-to-gcal — YYYYMMDD HH:MM–HH:MM | Title` (append `| gcal: EVENT_ID` if step 4 succeeded).
6. If no token is present, skip step 4 silently — writing to `EVENTS.md` is the primary record. Do not surface to `## HUMAN`.

### `sync-day`

Re-fetches events for this specific day from Google Calendar and rewrites `EVENTS.md`, then idempotently injects a `notes` action per event into this day's own `TODO.md`. Uses the same token → MCP → ICS fetch path as the `sync` card (see below) but scoped to a single date's `timeMin`/`timeMax`.

1. Fetch events for this day only; rewrite `EVENTS.md` from `.flowdeck/_energy-cards/DAY.md.template` exactly as the `sync` card does for one day.
2. For each event fetched, check whether a line containing `<!-- evt:{id} -->` already exists anywhere in this day's `TODO.md`. If yes, skip it — already injected, do not duplicate.
3. For each event with no existing marker, append to `## ACTIONS`:
   ```
   - [ ] notes — {title} {start} <!-- evt:{id} -->
   ```
4. Do not touch any other line in `TODO.md` — existing `## BOT`/`## HUMAN` content and already-checked actions are left as-is.

Sources without a stable id (none in the current token/MCP/ICS chain — Google Calendar API items and ICS `VEVENT`s both carry one) fall back to a normalized `title|start` hash as the marker instead of the id.

### `notes`

Activated per-event by `sync-day` (see above). When moved to `## BOT` and played:

1. Parse `{title}`, `{start}`, and the `evt:{id}` marker from the task line.
2. If `NOTES.md` does not exist in this day's folder, scaffold it from `.flowdeck/_energy-cards/NOTES.md.template` substituting `{{SLUG}}`, `{{WEEKDAY}}`, `{{DATE_LONG}}` and the first heading.
3. If `NOTES.md` exists but has no heading carrying this event's `<!-- evt:{id} -->` marker, append `## {start} {title} <!-- evt:{id} -->` as a new heading with an empty body below it.
4. If a heading for this `id` already exists, do nothing to `NOTES.md` (notes are freeform and human-owned once the heading exists).
5. Replace the task line with `- [x] notes — {start} {title} <!-- evt:{id} -->` (mark done; the marker is kept so `sync-day` recognizes it as already injected).

---

## Instrument cards (folder cards — scaffolded by `calendardeck-init`, played in place, never melded)

Per the folder-is-card rule (sleeve `SPEC.md`), each carries its own `TODO.md` with `lifecycle: recurring` frontmatter; these are **not** `_sleeve/` residents and **not** blueprints. Play one with `flowdeck play .calendardeck/<path>` or in place; a play resets its `## BOT` checkboxes for the next run, and the `.*` `.flowdeckignore` rule keeps `.calendardeck/` out of `flowdeck turn` sweeps.

- `.flowdeck/.calendardeck/TODO.md` — the standing sync card, at the root of the `.calendardeck/` tree rather than nested under `_sync/`, since it acts across the whole tree (day/week/month/year/events), not a single sub-folder: pulls events from Google Calendar (token → MCP → ICS fallback chain, per `_sync/SYNC.md`) and creates/updates year/month/week/day cards for the configured sync range. Play it with `flowdeck play .calendardeck`.

`_sync/SYNC.md` (calendar ID, sync range, optional public source, run log) remains the config file the root card reads from and writes its run log to — only the playable `TODO.md` moved to the tree root.

## Blueprints

calendardeck ships no true-template blueprints — every instrument is either the sleeve-resident init ritual or a folder card scaffolded by it.

## Usage

- **Sync:** play `.calendardeck`
- **Play a day:** `flowdeck play .calendardeck/20260601`
- **Add event from task:** move `send-to-gcal` to `## BOT` in any card, then play it
- **Quick, ad-hoc meeting:** scaffold `.calendardeck/_events/<YYYY-MM-DD>-<slug>/EVENT.md` directly, or via a cross-deck `add-meeting` action (see creamdeck)

## Sleeve residents & `sleeveCards`

The manifest's `sleeveCards` field lists exactly one card: `calendardeck-init`. It is a **ritual** (`lifecycle: ritual`, `recurrence: on-demand`): `flowdeck install calendardeck` copies it into the deck's own `_sleeve/` (`.flowdeck/.calendardeck/_sleeve/`) and plays it in place; replaying it is `flowdeck install calendardeck --repair` (every step create-if-missing). It is never melded.

`sleeveCards` holds **no operational instruments** — the standing sync instrument is folder-scoped (root of `.calendardeck/`, since it spans the whole tree) and therefore a folder card, not a sleeve resident. the board's root `_sleeve/` is reserved for project-generic / cross-cutting instruments; a deck's own `_sleeve/` holds its rituals; calendardeck ships none beyond its init ritual.
