---
lifecycle: one-shot
---

# emaildeck-backfill-bodies
<!-- lifecycle: one-shot -->

## BOT

- [ ] Check if `.flowdeck/.emaildeck/` exists. If not, stop and note under `## HUMAN` to run `emaildeck-init` first.

- [ ] **Authenticate** — read `~/.config/flowdeck/tokens/google.json`. If missing: stop and note under `## HUMAN` to run `flowdeck auth google`. If `expiry_date` < now: refresh via `~/.config/flowdeck/google-oauth.json` (POST to `https://oauth2.googleapis.com/token` with `grant_type=refresh_token`). On 401: stop and note to run `flowdeck auth google --force`.

- [ ] List all card directories under `.flowdeck/.emaildeck/mail-inbox/` that have an `EMAIL.md` with an empty or missing `## Body` section (i.e. no content after the `## Body` heading).

- [ ] For each such card:
  1. Read `EMAIL.md` — extract the Thread ID from the metadata table.
  2. Fetch full thread: `curl -s -H "Authorization: Bearer ACCESS_TOKEN" "https://www.googleapis.com/gmail/v1/users/me/threads/THREAD_ID?format=full"`
  3. Extract the `snippet` field from the top-level thread object.
  4. Walk `messages[0].payload` to find the `text/plain` part: check `parts[]` recursively for `mimeType: text/plain`. Decode the `body.data` field (base64url). If there is no `text/plain` part, fall back to `text/html` and **render it to readable markdown** — drop `<head>`/`<style>`/`<script>`/comments (incl. MSO `<!--[if…]-->`), convert `<a href>`→`[text](url)` and `<strong>`/`<b>`→`**bold**`, turn block boundaries (`<br>`, `</p>`, `</div>`, `</tr>`, `<li>`)→line breaks, strip remaining tags, decode HTML entities, and collapse blank lines. Never write raw HTML into `## Body`. (This mirrors the `htmlToText` renderer in `emaildeck_run.js`.)
  5. Append the snippet under `## Snippet` (if currently empty) and the decoded body under `## Body` in the card's `EMAIL.md`.

- [ ] Report under `## HUMAN`: how many cards were updated, how many were already populated, any thread IDs that failed.

## HUMAN

#### COMMENTS
