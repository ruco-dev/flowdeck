---
lifecycle: ritual
recurrence: on-demand
---

# calendardeck-init

> **Sleeve resident.** This is a ritual card: it lives in the deck's own `_sleeve/` (`.flowdeck/.calendardeck/_sleeve/`), is played in place, and is never melded. Replaying it **is** `flowdeck install calendardeck --repair` — every step is create-if-missing, so a re-play converges the working tree without clobbering local tuning.

## BOT

- [ ] **Migrate legacy unprefixed folders** (installs from before calendardeck 0.5.0 — the `_`-prefix rename). For each pair below, if the old path exists and the new one does not, rename it with `git mv <old> <new>` (plain `mv` if untracked). If **both** exist, do not merge — surface the conflict under `## HUMAN` and leave both untouched. If only the new name exists (or neither), skip silently — replay stays idempotent:
  - `.flowdeck/.calendardeck/sync/` → `.flowdeck/.calendardeck/_sync/`
  - `.flowdeck/.calendardeck/events/` → `.flowdeck/.calendardeck/_events/`
  - `.flowdeck/_sleeve/calendardeck-init/` → `.flowdeck/.calendardeck/_sleeve/calendardeck-init/` (sleeve cards moved from the board's root `_sleeve/` into each deck's own — `flowdeck update calendardeck` also performs this relocation itself)
  After any move, update literal old-path references inside the migrated instance's own files (instrument `TODO.md`s, config/index docs) to the `_`-prefixed paths; the instance's `AGENT.md` copies are refreshed from the deck package by `flowdeck update calendardeck` itself.

- [ ] This ritual is idempotent — do not stop early if `.flowdeck/.calendardeck/` already exists. Create each path only if missing; skip silently otherwise:
  - `.flowdeck/.calendardeck/`
  - `.flowdeck/.calendardeck/_sync/`
  - `.flowdeck/.calendardeck/_events/` — flat, ad-hoc quick-event cards; scaffolded empty so `add-meeting` (see AGENT.md) always has a write target, even if no quick event has been created yet.

- [ ] Add `.*` to `.flowdeck/.flowdeckignore` if not already present.

- [ ] Check if `.flowdeck/.calendardeck/_sync/SYNC.md` exists. If not, scaffold it from `.flowdeck/_energy-cards/SYNC.md.template` with placeholder values:
  - Replace `{{CALENDAR_ID}}` with `primary` (syncs the user's main calendar when authenticated via `flowdeck auth google`; replace with a specific Calendar ID, a public Google Calendar ID, or a direct `.ics` URL to target another)
  - Replace `{{PUBLIC_SOURCE}}` with `en.usa#holiday@group.v.calendar.google.com` (US holidays — overridable or leave blank to disable)
  - Replace `{{SYNC_RANGE}}` with `current-month`
  Then surface the path under `## HUMAN` so the user can confirm the Calendar ID, preferred sync range, and optional public source.

- [ ] Scaffold the **root instrument card** — `.flowdeck/.calendardeck/TODO.md` — only if it does not already exist (never clobber local tuning). This is a folder card (per the folder-is-card rule, sleeve `SPEC.md`): it acts on the whole `.calendardeck/` tree (day/week/month/year/events), not a single sub-folder, so it lives at the root of the tree rather than nested under `_sync/`. It is *not* a `_sleeve/` resident and *not* a blueprint. Play it with `flowdeck play .calendardeck`; a play resets its `## BOT` checkboxes for the next run:

  ```markdown
  ---
  lifecycle: recurring
  ---

  # calendardeck

  ## BOT

  - [ ] **Synchronize calendar** — pull events from Google Calendar and create/update calendardeck cards for the full sync range defined in `_sync/SYNC.md`.

  - [ ] Read `.flowdeck/.calendardeck/_sync/SYNC.md` — extract `Calendar ID`, `Sync Range`, `Last Sync`, and `Public Source`. If the file does not exist, stop and note under `## HUMAN` to run `calendardeck-init` first. Treat a blank or placeholder `Public Source` as not set.

  - [ ] Validate config before proceeding:
    - If `Calendar ID` is empty or still a placeholder (e.g. `{{CALENDAR_ID}}`, `your-calendar-id@gmail.com`): treat as `primary` — the authenticated user's main calendar. Only stop if there is also no token at `~/.config/flowdeck/tokens/google.json` **and** no `Public Source` is set.
    - If `.flowdeck/_energy-cards/DAY.md.template` does not exist: stop and surface under `## HUMAN` to run `calendardeck-init` first to deploy energy-card templates.

  - [ ] Determine the sync date range:
    - If `## HUMAN` below specifies an explicit range (e.g. `range: 2026-06-01–2026-06-30`), use that.
    - Otherwise use the `Sync Range` field from `SYNC.md` (default: current month).
    - Resolve to concrete start/end ISO dates.

  - [ ] Fetch events for the `Calendar ID` (use `primary` if blank or placeholder):
    - If the `Calendar ID` value starts with `http`: fetch it directly as an ICS URL (no auth needed), parse the ICS feed, and skip the OAuth path below.
    - Otherwise URL-encode the Calendar ID (replace `@` → `%40`, `#` → `%23`, and apply standard percent-encoding for any other special characters). `primary` needs no encoding.
    - **Tier 1 — `flowdeck auth` token** (preferred — works for any calendar the user owns, including `primary`, and is the only tier that works headless/cron):
      - Read `~/.config/flowdeck/tokens/google.json`. If it exists and has an `access_token`:
        - If `expiry_date` < now: refresh the token —
          - Read `~/.config/flowdeck/google-oauth.json` to get `client_id` and `client_secret`.
          - Run: `curl -s -X POST https://oauth2.googleapis.com/token -d "client_id=CLIENT_ID&client_secret=CLIENT_SECRET&refresh_token=REFRESH_TOKEN&grant_type=refresh_token"`
          - Save the new token (merge `access_token` and `expiry_date`) back to `~/.config/flowdeck/tokens/google.json`. If the refresh request itself fails (non-2xx), treat this tier as failed and drop to Tier 2.
        - Fetch events: `curl -s -H "Authorization: Bearer ACCESS_TOKEN" "https://www.googleapis.com/calendar/v3/calendars/ENCODED_ID/events?timeMin=TIME_MIN&timeMax=TIME_MAX&singleEvents=true&orderBy=startTime"`
        - Parse the JSON `items` array.
        - If 401: token is invalid — treat this tier as failed and drop to Tier 2 (do not stop the card here).
      - If no token file exists at all, treat this tier as failed and drop to Tier 2.
    - **Tier 2 — MCP Google Calendar** (tried only after Tier 1 fails — refresh failure or 401 — never preferred over the token when the token works):
      - Call the `mcp__claude_ai_Google_Calendar__list_events` tool, scoped to this calendar and the `timeMin`/`timeMax` range. Read its live argument schema before calling — do not hardcode a guessed shape, since the connector's exact args may differ from what's documented here.
      - If the connector is unavailable, requires re-authorization, or the call errors: treat this tier as failed and drop to Tier 3. Do not stop the card — this is a silent fallback, not a hard failure.
      - If it succeeds, use the returned events and skip Tier 3.
    - **Tier 3 — public ICS** (last resort, unauthenticated):
      `GET https://calendar.google.com/calendar/ical/ENCODED_ID/public/basic.ics`
      If 2xx: parse the ICS feed for `VEVENT` entries within `timeMin`–`timeMax` (compare against `DTSTART`). Note: personal calendar ICS feeds are often stale — run `flowdeck auth google` once for reliable sync.
      If 403/404: stop and note under `## HUMAN` to run `flowdeck auth google` to authorize, then replay this card. If Google blocks the sign-in, the user may not be on the beta tester list — ask them to email hello@ruco.dev.

  - [ ] **If `Public Source` is set** (non-blank, non-placeholder): fetch via ICS (public holiday calendars work reliably without auth).
    - If it looks like a calendar ID (contains `@`): fetch `https://calendar.google.com/calendar/ical/ENCODED_ID/public/basic.ics`.
    - If it looks like an ICS URL (starts with `http`): fetch directly.
    - Parse events within `timeMin`–`timeMax`. Tag all public events with `source: public` internally. When writing event rows, append ` (public)` to the event title. Public events are read-only — never write back to the public source.

  - [ ] For each year spanned by the sync range:
    - Compute slug: `{{YYYY}}`.
    - Path: `.flowdeck/.calendardeck/{{YYYY}}/`
    - Create the directory if missing.
    - Write `SUMMARY.md` from `.flowdeck/_energy-cards/YEAR.md.template`.
    - Scaffold `TODO.md` only if it does not exist:

      ```
      ---
      lifecycle: recurring
      recurrence: on-demand
      ---

      # {{YYYY}}

      ## BOT

      ## HUMAN

      ## ACTIONS

      - [ ] send-to-gcal — [Title | YYYY-MM-DD | HH:MM–HH:MM | optional description]
      ```

  - [ ] For each month spanned by the sync range:
    - Compute slug: `{{YYYYMM}}`.
    - Path: `.flowdeck/.calendardeck/{{YYYY}}/{{YYYYMM}}/`
    - Create the directory if missing.
    - Write `SUMMARY.md` from `.flowdeck/_energy-cards/MONTH.md.template`.
    - Scaffold `TODO.md` only if it does not exist:

      ```
      ---
      lifecycle: recurring
      recurrence: on-demand
      ---

      # {{YYYYMM}}

      {{MONTH_LONG}} {{YYYY}}

      ## BOT

      ## HUMAN

      ## ACTIONS

      - [ ] send-to-gcal — [Title | YYYY-MM-DD | HH:MM–HH:MM | optional description]
      ```

  - [ ] For each week spanned by the sync range:
    - Compute slug: `{{YYYYMM}}W{{N}}` where N = `ceil(first_day_of_week_in_month / 7)`. A week belongs to the month in which it starts.
    - Path: `.flowdeck/.calendardeck/{{YYYY}}/{{YYYYMM}}/{{YYYYMMWN}}/`
    - Create the directory if missing.
    - Write `SUMMARY.md` from `.flowdeck/_energy-cards/WEEK.md.template`.
    - Scaffold `TODO.md` only if it does not exist:

      ```
      ---
      lifecycle: recurring
      recurrence: on-demand
      ---

      # {{SLUG}}

      Week {{N}} of {{MONTH_LONG}} — {{DATE_RANGE}}

      ## BOT

      ## HUMAN

      ## ACTIONS

      - [ ] send-to-gcal — [Title | YYYY-MM-DD | HH:MM–HH:MM | optional description]
      ```

  - [ ] For each calendar day in the sync range — whether or not it has events:
    - Compute slug: `YYYYMMDD`, where `DD` is the day-of-month zero-padded to **exactly 2 digits** (e.g. day 8 → `08`, not `008`). A day belongs to the week in which it falls.
    - Guard: the computed slug must match `^\d{8}$` before it is used in any path. If it doesn't, stop and surface the malformed slug under `## HUMAN` instead of creating a directory — do not silently write to a wrong-length path.
    - Path: `.flowdeck/.calendardeck/{{YYYY}}/{{YYYYMM}}/{{YYYYMMWN}}/{{YYYYMMDD}}/`
    - Create the directory if missing.
    - Write `EVENTS.md` from `.flowdeck/_energy-cards/DAY.md.template` — substitute `{{SLUG}}`, `{{WEEKDAY}}`, `{{DATE_LONG}}`, and `{{EVENTS_TABLE}}` (one row per event: time, title, location, attendees). If the day has zero events, substitute `{{EVENTS_TABLE}}` with `_No events._` so the card is still well-formed.
    - Scaffold `TODO.md` only if it does not exist — do not overwrite. Use this template:

      ```
      ---
      lifecycle: recurring
      recurrence: on-demand
      ---

      # {{SLUG}}

      {{WEEKDAY}}, {{DATE_LONG}}

      ## BOT

      ## HUMAN

      ## ACTIONS

      <!-- Move an item to ## BOT to activate it, then play this card. -->
      <!-- Public event lines below are pre-filled from the public calendar source and are read-only. -->
      <!-- Do not regenerate this section on re-sync — only scaffold when TODO.md does not yet exist. -->

      {{PUBLIC_EVENT_ACTIONS}}
      - [ ] send-to-gcal — [Title | YYYY-MM-DD | HH:MM–HH:MM | optional description]
      - [ ] sync-day — re-fetch events for this day only
      ```

      Where `{{PUBLIC_EVENT_ACTIONS}}` expands to one `send-to-gcal` line per public event on this day:
      ```
      - [ ] send-to-gcal — [{{PUBLIC_TITLE}} | {{SLUG}} | {{START_TIME}}–{{END_TIME}} | {{DESCRIPTION}}]
      ```
      If there are no public events on this day, omit `{{PUBLIC_EVENT_ACTIONS}}` entirely.

  - [ ] Append a row to the `## Run Log` table in `_sync/SYNC.md`:
    | {{TODAY}} | {{RANGE}} | {{DAYS_SYNCED}} | {{EVENTS_FETCHED}} | {{CARDS_CREATED}} | {{CARDS_UPDATED}} |

  - [ ] Surface a sync summary under `## HUMAN`: range synced, number of events fetched, cards created, cards updated.

  ## HUMAN

  - [ ] Configure `.flowdeck/.calendardeck/_sync/SYNC.md` before syncing, then authorize Google Calendar by running `flowdeck auth google` in the terminal (a browser opens — click Allow; one-time per machine). `Calendar ID` is optional when authenticated — it defaults to `primary` (your main calendar); set it only to target a specific calendar, or to a direct `.ics` URL / public Google Calendar ID for an unauthenticated read. Set `Sync Range` to the desired range (e.g. `current-month`). **Note:** calendardeck is in private beta — if Google blocks the sign-in, email hello@ruco.dev to be added as a tester.

  <!-- Optional: specify an explicit sync range.
  range: YYYY-MM-DD–YYYY-MM-DD
  -->
  ```

- [ ] Scaffold `.flowdeck/.calendardeck/README.md` from `_energy-cards/README.md.template`. Repair-safe: create it if missing; if it exists, regenerate it from the current template and refresh the stamp — unless a `.flowdeck/.calendardeck/.readme-hash` stamp already exists and no longer matches the file's current content (real evidence of a hand-edit since the last generation; a *missing* stamp is not such evidence and must not block regeneration). In that hand-edited case, leave it alone and note under `## HUMAN` that it's locally customized and may be out of sync. Write/refresh `.flowdeck/.calendardeck/.readme-hash` (sha256 of the file) after writing or confirming it.

- [ ] Surface under `## HUMAN`:
  - Path to `_sync/SYNC.md`. Calendar ID defaults to `primary` (main calendar) when authenticated — change it only to target a different calendar, a public GCal ID, or a direct `.ics` URL. Set `Sync Range` and optionally `Public Source` (a public GCal ID or ICS URL — defaults to US holidays; leave blank to disable).
  - Reminder to authorize Google Calendar before playing the root card: run `flowdeck auth google` in the terminal. A browser will open — click Allow. One-time per machine. **Note:** calendardeck is in private beta — if Google blocks the sign-in, email hello@ruco.dev to be added as a tester.

- [ ] Commit **only if this replay changed anything** (a repair replay on an already-scaffolded project produces no diff): `git add .flowdeck/.calendardeck && git diff --cached --quiet || git commit -m "deck: init calendardeck"`.

## HUMAN

#### COMMENTS
