---
title: "Architectural Decision Record"
type: documentation
tags: [documentation, architecture, decision]
---

# ADR-0001: calendardeck calendar transport — keep browser-OAuth, drop the MCP server

**Date:** 2026-06-27
**Author:** Ruco
**Status:** Accepted

---

## Context

> calendardeck syncs Google Calendar events into flowdeck cards and offers a `send-to-gcal` action to push tasks back. Two questions about how it talks to Google have churned: how to *read* a private calendar, and how to *write* events back. An earlier card (`calendardeck-switch-mcp`, since discarded) introduced the `@cocal/google-calendar-mcp` MCP server as the write-back transport. A later commit, `e3b2911` ("remove Google Calendar API from calendardeck — ICS-only one-way sync"), interpreted "remove Google Calendar API" as "drop everything Google-API" and deleted the browser-OAuth token flow, the REST v3 fetch, and the `send-to-gcal` write-back — leaving an ICS-only read path.

The `e3b2911` scope was an over-removal. The intent was never to drop authenticated access; it was to remove the third-party MCP server dependency and any API-key plumbing. ICS alone cannot read a user's private primary calendar reliably (personal ICS feeds are stale or unavailable) and cannot write events at all. We needed to settle the transport explicitly so the deck stops oscillating between "ICS-only" and "full API."

## Decision

**We will** read the primary calendar over the Google Calendar REST API (v3) authenticated with the existing browser-OAuth token from `flowdeck auth google`, re-implement `send-to-gcal` write-back as an authenticated `POST` to the same REST API, keep ICS as the secondary read path for the optional public source (and as an unauthenticated fallback), and remove the `@cocal/google-calendar-mcp` MCP server and any API-key configuration.

## Rationale

Browser-OAuth is already implemented and shipped in the flowdeck CLI (`flowdeck auth google`, token stored at `~/.config/flowdeck/tokens/google.json`); the deck only needs to *call* it. The MCP server added a runtime dependency and an extra moving part for a capability the OAuth token already grants directly over REST. ICS remains the right tool for public, unauthenticated feeds (holidays, sports), where it needs no auth and overlaps nothing with the MCP removal.

### Pros

- Reuses the existing `flowdeck auth google` OAuth plumbing — no new credentials, no new dependency to install or audit
- One transport for both read and write of the user's own calendar (REST v3), reducing surface area
- Public sources stay on ICS, which is auth-free and reliable for shared calendars
- Drops the `@cocal/google-calendar-mcp` dependency that `calendardeck-switch-mcp` introduced

### Cons

- Write-back (`send-to-gcal`) is now hand-rolled against REST v3 (`POST .../calendar/v3/calendars/{id}/events`) rather than delegated to a packaged MCP tool — slightly more template logic to maintain
- Verification is grep-only; there is no automated test harness for the OAuth fetch or write-back, so end-to-end checks are manual

## Alternatives Considered

### Option A: ICS-only, no authenticated API (the `e3b2911` state)

**Description:** Drop OAuth, REST v3, and `send-to-gcal` entirely; read every calendar through public ICS feeds.

**Pros:** No auth, no tokens, smallest possible code surface.

**Cons:** Cannot read a private primary calendar reliably; personal ICS feeds are stale or unavailable; no write-back at all, so `send-to-gcal` is impossible.

**Why rejected:** It removes working, wanted functionality (authenticated read + write) to solve a problem that was actually about the MCP dependency, not the API. This is the over-removal this ADR corrects.

### Option B: Keep the `@cocal/google-calendar-mcp` MCP server for write-back

**Description:** Restore OAuth read but keep delegating event creation to the MCP server, as `calendardeck-switch-mcp` proposed.

**Pros:** Write-back logic lives in a packaged tool rather than in the card template.

**Cons:** Adds a third-party runtime dependency for a capability the OAuth token already covers over REST; another component to install, version, and authorize.

**Why rejected:** The whole point of the cleanup was to drop the MCP dependency. The OAuth token makes the REST `POST` path available with no extra moving parts.

## Consequences

### Positive

- calendardeck has one coherent, documented transport story: REST v3 over browser-OAuth for the user's calendar, ICS for public sources
- The deck templates, blueprint, and AGENT docs now describe the restored two-tier design accurately, with no contradictory "ICS-only / not supported" wording
- The private-beta `validator-mc@ruco.pt` tester gate is restored alongside the OAuth sign-in it gates

### Negative

- More logic carried in `SYNC-TODO.md.template` and the AGENT docs (token refresh, REST fetch, REST write-back) than an ICS-only deck would need

### Risks

- No automated tests — the restored OAuth fetch and `send-to-gcal` write-back should get a manual end-to-end check before relying on them
- The deck depends on out-of-repo plumbing (`flowdeck auth google` and `~/.config/flowdeck/tokens/google.json`) living in the flowdeck repo; confirmed present and untouched by `e3b2911`, but a future removal there would break the restored path

## Implementation Notes

- Supersedes the discarded `calendardeck-switch-mcp` card (which introduced the MCP server) and corrects commit `e3b2911`, which over-removed the OAuth/REST path.
- `SYNC-TODO.md.template`: restored the token-first OAuth REST v3 fetch with token refresh against `oauth2.googleapis.com/token`, kept the direct-`.ics`-URL shortcut and the no-token ICS fallback, kept the public source on ICS, and restored the `send-to-gcal` / `sync-day` action scaffolds.
- `AGENT.md` and `AGENT-section.md`: restored the `send-to-gcal` and `sync-day` action specs, with write-back re-pointed from `mcp__google_calendar__create_event` to an authenticated `POST https://www.googleapis.com/calendar/v3/calendars/{id}/events`.
- `SYNC.md.template`, `calendardeck-init/TODO.md`, `DECKS.md`, and the four `*.md.template` headers: restored Google Calendar / OAuth wording, the `primary` default, and the `validator-mc@ruco.pt` beta note.
- Verification (grep-only): denylist `cocal | google-calendar-mcp | mcp__google_calendar | create_event | credentials.json | api-key` returns no matches across `decks/calendardeck/`; the browser-OAuth surface (`oauth`, `flowdeck auth`, `googleapis.com/calendar/v3`, `oauth2.googleapis.com/token`, `send-to-gcal`) is present and intended to stay.

---

*Provided by [mdblu](https://github.com/ruco-dev/mdblu)*

---
*Made with [mdblu](https://github.com/ruco-dev/mdblu) · source: `templates/ADR.md.template`*
