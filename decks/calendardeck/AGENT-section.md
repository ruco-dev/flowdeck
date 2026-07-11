## calendardeck

The `.flowdeck/.calendardeck/` directory holds Google Calendar events as flowdeck cards. Sync is one-way: GCal → local. The primary calendar is read via the Google Calendar REST API (v3) using the `flowdeck auth google` token; an optional public source is read via ICS. To push a task to Calendar, use `send-to-gcal` in any card's `## ACTIONS`.

**Card hierarchy:** Year → Month → Week → Day

**Card slugs:**
- Year: `YYYY` (e.g. `2026`) — path: `.calendardeck/2026/`
- Month: `YYYYMM` (e.g. `202606`) — path: `.calendardeck/2026/202606/`
- Week: `YYYYMMWn` (e.g. `202606W1`, W1 = days 1–7) — path: `.calendardeck/2026/202606/202606W1/`
- Day: `YYYYMMDD` (e.g. `20260601`) — path: `.calendardeck/2026/202606/202606W1/20260601/`

**Card anatomy:** `EVENTS.md` (day) or `SUMMARY.md` (week/month/year) — synced, do not edit. `TODO.md` — your tasks and activated actions.

**Public calendar source:** `_sync/SYNC.md` accepts an optional `Public Source` field — a public GCal ID or ICS URL. Public events are tagged "(public)" and are read-only; day cards ship a pre-filled `send-to-gcal` line per public event to copy it to your personal calendar.

**`send-to-gcal` — adding an event**

Format: `- [ ] send-to-gcal — [Title | YYYY-MM-DD | HH:MM–HH:MM | optional description]`

Move to `## BOT` and play the card. Execution steps:
1. Parse title, date, start/end times, description.
2. Compute day card path — week slug `YYYYMMWn`: W1 = days 1–7, W2 = 8–14, W3 = 15–21, W4 = 22–28, W5 = 29–31. Full path: `.calendardeck/YYYY/YYYYMM/YYYYMMWn/YYYYMMDD/EVENTS.md`. Scaffold if missing.
3. Append row to `EVENTS.md`: `| HH:MM–HH:MM | Title | — | — |`
4. If a `flowdeck auth` token is present, `POST` the event to the Google Calendar REST API (`https://www.googleapis.com/calendar/v3/calendars/primary/events`, `Authorization: Bearer ACCESS_TOKEN`); capture the event ID.
5. Replace task line: `- [x] sent-to-gcal — YYYYMMDD HH:MM–HH:MM | Title` (append `| gcal: EVENT_ID` if step 4 succeeded).
6. If no token, skip step 4 silently — `EVENTS.md` is the primary record.

**`sync-day` — re-fetching one day**

Re-fetches this day's events and idempotently appends a `- [ ] notes — {title} {start} <!-- evt:{id} -->` action per event to `## ACTIONS` (dedupe key: the event `id` marker, not title+start — skip if the marker already exists anywhere in `TODO.md`). Playing a `notes` action appends a `## {start} {title} <!-- evt:{id} -->` heading to this day's `NOTES.md` (scaffolded on first use), then checks itself off.

**Quick events** — `_events/<YYYY-MM-DD>-<slug>/EVENT.md`: a flat, ad-hoc sibling to the synced hierarchy for meetings that don't warrant walking the tree. Scaffolded empty by default under `.flowdeck/.calendardeck/_events/`. See `add-meeting` for spawning one from another deck.

**Blueprints:**
- `calendardeck-init` — scaffold `.flowdeck/.calendardeck/` and the `sync` card
