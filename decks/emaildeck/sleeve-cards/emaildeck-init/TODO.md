---
lifecycle: ritual
recurrence: on-demand
---

# emaildeck-init

> **Sleeve resident.** This is a ritual card: it lives in the deck's own `_sleeve/` (`.flowdeck/.emaildeck/_sleeve/`), is played in place, and is never melded. Replaying it **is** `flowdeck install emaildeck --repair` — every step is create-if-missing, so a re-play converges the working tree without clobbering local tuning.
>
> **Scope (0.9.0):** `emaildeck-init` scaffolds **structure only** — folders, the runner, `ACTIONS.md`, mocks, and `AGENT.md`. It does **not** establish filters or fetch mail. First-run setup (auth preflight, filter interview, first backfill) lives in the sibling ritual `emaildeck-setup`; recurring inboxing lives in the `mail-inbox/` folder card. The final BOT step hands off to setup.

## BOT

- [ ] **Migrate legacy `_`-prefixed card folders back to plain names** (ADR-0006 underscore reversal — `_` is reserved for unplayable piles; a folder carrying a playable root `TODO.md` gets a plain name). For each pair below, if the old path exists and the new one does not, rename it with `git mv <old> <new>` (plain `mv` if untracked). If **both** exist, do not merge — surface the conflict under `## HUMAN` and leave both untouched. If only the new name exists (or neither), skip silently — replay stays idempotent:
  - `.flowdeck/.emaildeck/_filters/` → `.flowdeck/.emaildeck/filters/`
  - `.flowdeck/.emaildeck/_mail-inbox/` → `.flowdeck/.emaildeck/mail-inbox/`
  - `.flowdeck/.emaildeck/_mail-archive/` → `.flowdeck/.emaildeck/mail-archive/`
  - `.flowdeck/.emaildeck/_drafts/` → `.flowdeck/.emaildeck/drafts/`

  Then apply the two **legacy forward renames** that remain valid (pre-0.8.0 installs where these were plain; `digests`/`scripts` are genuine piles and keep the `_`): same both-exist→surface-conflict rule.
  - `.flowdeck/.emaildeck/digests/` → `.flowdeck/.emaildeck/_digests/`
  - `.flowdeck/.emaildeck/scripts/` → `.flowdeck/.emaildeck/_scripts/`
  - `.flowdeck/_sleeve/emaildeck-init/` → `.flowdeck/.emaildeck/_sleeve/emaildeck-init/` (sleeve cards moved from the board's root `_sleeve/` into each deck's own — `flowdeck update emaildeck` also performs this relocation itself)
  After any move, update literal old-path references inside the migrated instance's own files (instrument `TODO.md`s, config/index docs) to the new paths; the instance's `AGENT.md` copies are refreshed from the deck package by `flowdeck update emaildeck` itself.

- [ ] This ritual is idempotent — do not stop early if `.flowdeck/.emaildeck/` already exists. For each path below, create it only if missing; skip silently if it already exists:
  - `.flowdeck/.emaildeck/`
  - `.flowdeck/.emaildeck/filters/`
  - `.flowdeck/.emaildeck/mail-inbox/`
  - `.flowdeck/.emaildeck/mail-archive/`
  - `.flowdeck/.emaildeck/drafts/`
  - `.flowdeck/.emaildeck/_digests/` (dated digest docs written by the `emaildeck-digest` blueprint; `_digests/deep/` is created on demand)

- [ ] Install the runner script into `.flowdeck/.emaildeck/_scripts/`. Create the directory, then copy `emaildeck_run.js` into it from the deck's `_scripts/` prefix at `.flowdeck/_scripts/emaildeck/` (populated by `flowdeck install` per the manifest `scripts` array — the same runtime-prefix convention as `_energy-cards/`). **Interim until flowdeck-cli honors `manifest.scripts`:** if `_scripts/` is absent but a legacy flat copy already exists at `.flowdeck/.emaildeck/emaildeck_run.js`, leave it in place and treat it as already installed — this copy was never nested under a subfolder in the field, so there is nothing to migrate, unlike creamdeck's scripts. Record which path is live (`.flowdeck/.emaildeck/_scripts/emaildeck_run.js` canonical, or the legacy flat path) — later steps that scaffold a filter's runner invocation line must use whichever path is actually live in this project. If neither source is present, note under `## HUMAN` that the script must be copied manually and filters will not run until it is. (The runner resolves `filters/` and `mail-inbox/` with a `_`-prefixed fallback, so it works whether or not this instance has migrated yet.)

- [ ] Add `.*` to `.flowdeck/.flowdeckignore` if not already present, so `.emaildeck/` is excluded from `flowdeck turn`. This is the sub-deck boundary; per ADR-0006, turn-exclusion of individual instrument cards is frontmatter's job (`recurrence:` / `lifecycle:`), not the folder name.

- [ ] Scaffold the four **instrument cards** — one per operational folder, each played in place (never melded). Per the folder-is-card rule (sleeve `SPEC.md`) these are *not* `_sleeve/` residents and *not* blueprints: they live on the `.emaildeck/` folder they act on, carry `lifecycle: recurring` + `recurrence:` frontmatter (so playing one resets its `## BOT` checkboxes for the next run, and the recurrence records the intended rhythm — a reminder, not a limiter), and are excluded from `turn` sweeps via the `.*` ignore rule above. Play one with `flowdeck play mail-inbox` (bare leaf) or in place. Write each file **only if it does not already exist** (never clobber local tuning):

  - `.flowdeck/.emaildeck/filters/TODO.md`:
    ```markdown
    ---
    lifecycle: recurring
    recurrence: on-demand
    ---

    # Filters

    ## BOT

    - [ ] List all filter cards under `filters/` (subdirectories containing a `FILTER.md`) and their last run date from each `FILTER.md`'s `## Run Log`.

    ## HUMAN

    - [ ] Add a new filter: `flowdeck blueprint use emaildeck-add-filter start` (or run the guided `flowdeck play emaildeck-setup` interview)

    #### COMMENTS
    ```

  - `.flowdeck/.emaildeck/mail-inbox/TODO.md`:
    ```markdown
    ---
    lifecycle: recurring
    recurrence: daily
    ---

    # Inbox

    > Pure inboxing — sweep the established filters, fetch new threads, create message cards. Filters are established by `emaildeck-setup`; this card only runs them. `recurrence: daily` is the intended rhythm, not a limiter — use the `schedule-inboxing` action to install an actual trigger at whatever cadence this instance needs.

    ## BOT

    - [ ] Scan `.flowdeck/.emaildeck/filters/` for filter card subdirectories. A valid filter card contains both `FILTER.md` and `TODO.md`. List valid filters; for incomplete filters (missing either file), note under `## HUMAN` as "incomplete: <slug> (missing <file>)".
    - [ ] If no valid filters exist, note under `## HUMAN` that this instance has no filters yet — run `flowdeck play emaildeck-setup` to establish them — then stop.
    - [ ] For each valid filter, play its `TODO.md` to fetch Gmail threads and create message cards. On failure: if it's an auth error (token expired/revoked), halt immediately and report "re-authenticate"; for other errors, skip that filter, record error under `## HUMAN`, and continue with remaining filters.
    - [ ] process-inbox — for each message card under `mail-inbox/` with activated (unchecked) items in its `## BOT`, execute those items inline per `ACTIONS.md`, checking each off with a `>` note on that card. Cards with an empty `## BOT` are dormant menus — skip them untouched. Execute in place, same as the filter sweep above — never by spawning flowdeck subcommands. On a per-card failure, note it under that card's `## HUMAN` and continue with the remaining cards.
    - [ ] Report under `## HUMAN`: filters run, threads found per filter, message cards processed (with the actions executed per card), incomplete/failed filters with details, and filters that found zero threads in this run AND have never matched in prior runs (check `FILTER.md` run log).

    ## HUMAN

    ## ACTIONS

    <!-- Move an item to ## BOT to activate it. -->

    - [ ] schedule-inboxing — install a recurring trigger so inboxing runs on its own (crontab line or scheduled agent; see ACTIONS.md)
    - [ ] summarize-inbox — mint a dated thematic-summary card in `_digests/` from the email cards read this sweep (themes, project relevance, links to source cards; see ACTIONS.md)
    ```

  - `.flowdeck/.emaildeck/drafts/TODO.md`:
    ```markdown
    ---
    lifecycle: recurring
    recurrence: on-demand
    ---

    # Drafts

    ## BOT

    - [ ] List all draft cards in `drafts/` (subdirectories with a `TODO.md`).
    - [ ] process-drafts — for each draft card under `drafts/` with activated (unchecked) items in its `## BOT`, execute those items inline per `ACTIONS.md`, checking each off with a `>` note on that card. Cards with an empty `## BOT` are dormant menus — skip them untouched. Runs before the push steps below so content edits (e.g. `improve-language`) land before the draft reaches Gmail. Execute in place — never by spawning flowdeck subcommands. On a per-card failure, note it under that card's `## HUMAN` and continue with the remaining cards.
    - [ ] **Authenticate** — read `~/.config/flowdeck/tokens/google.json`; refresh if expired (same pattern as filter cards). On 401: stop and note to run `flowdeck auth google --force`.
    - [ ] For each reply draft (has `EMAIL.md` + a completed `draft-reply` task): read the drafted reply, encode as RFC 2822 base64url, POST to `https://www.googleapis.com/gmail/v1/users/me/drafts`.
    - [ ] For each compose draft (has `MESSAGE.md` with an empty `Gmail draft ID` row): read the To/Cc/Bcc/Subject table and `## Body`, encode as RFC 2822 base64url, POST to `https://www.googleapis.com/gmail/v1/users/me/drafts`, and write the returned draft ID back into the `Gmail draft ID` row of `MESSAGE.md`. Skip compose drafts that already have a draft ID.
    - [ ] Note each pushed draft under `## HUMAN` with its Gmail draft ID.

    ## HUMAN

    Review drafts in Gmail and send when ready.

    #### COMMENTS
    ```

  - `.flowdeck/.emaildeck/mail-archive/TODO.md`:
    ```markdown
    ---
    lifecycle: recurring
    recurrence: on-demand
    ---

    # Archive

    Processed message cards moved here by the `archive` action. Destination pile only — no further action.

    ## BOT

    - [ ] List archived cards in `mail-archive/` (subdirectories with an `EMAIL.md`). This pile is a destination only — take no further action on them.

    ## HUMAN

    #### COMMENTS
    ```

- [ ] Scaffold `.flowdeck/.emaildeck/README.md` if it does not already exist:
  ```
  # emaildeck

  Email filter rules (Gmail or Outlook) as flowdeck cards.

  **Before creating filters:**
  - For Gmail: `flowdeck auth google`
  - For Outlook: `flowdeck auth microsoft`

  ## First run

  `emaildeck-init` scaffolds structure only. To establish filters and fetch your first mail, run the guided setup ritual:

  ```bash
  flowdeck play emaildeck-setup
  ```

  It preflights auth, detects context (creamdeck domains, crunchdeck profile), interviews you to mint filter cards, and does a first wide-range backfill. Thereafter, recurring inboxing is `flowdeck play mail-inbox`.

  ## Recipes

  ### Get emails from a specific sender
  1. `flowdeck blueprint use emaildeck-add-filter start`
  2. Choose provider: `gmail` or `microsoft`
  3. Set query (syntax depends on provider):
     - Gmail: `from:name@example.com` or `from:@domain.com`
     - Outlook: `from:"name@example.com"` or `from:domain.com`
  4. Play the filter card — message cards land in `mail-inbox/`.

  ### Get emails relevant to a project
  Option A (automatic): if `.flowdeck/.crunchdeck/profile/PROFILE.md` exists, every filter already scores threads against your product profile and discards irrelevant ones. No extra setup.
  Option B (manual): create a filter with a keyword or sender query, then set `BOT: send-to-crunchdeck` as a Default Task — matched cards are routed to the crunchdeck inbox for triage.

  ### Get summaries of messages
  - Per card: open any message card in `mail-inbox/` and move `summarize` into `## BOT`.
  - Per filter (bulk): add `BOT: summarize` to the filter's `## Default Tasks` — every card created by that filter will auto-summarize when the filter runs.
  - Combined with relevance: set both `BOT: send-to-crunchdeck` and `BOT: summarize` as default tasks.

  ### Draft a new email
  1. `flowdeck blueprint use emaildeck-compose start`
  2. Fill in To / Subject / Body when prompted — a draft card is created in `drafts/`.
  3. Edit `MESSAGE.md` if needed, then move `push-to-gmail` into `## BOT` to push it to Gmail.

  ### Reply to a message
  1. Open a message card in `mail-inbox/`.
  2. Move `draft-reply` into `## BOT`. Add instructions after the `—` to guide the reply (e.g. `draft-reply — decline politely`), or leave it bare to let the bot draft from context.
  3. The reply is saved to `drafts/` — open it, review or edit `MESSAGE.md`, then move `push-to-gmail` into `## BOT`.

  ## Structure

  ACTIONS.md       — reference for all available email actions
  filters/<slug>/
    FILTER.md      — query, label, default task template
    TODO.md        — when played: fetch → label → create message cards in mail-inbox/
  mail-inbox/
    <date>-<slug>/
      EMAIL.md     — thread metadata
      TODO.md      — ## ACTIONS menu; move items to ## BOT or ## HUMAN to activate
  mail-archive/    — processed message cards (moved here by the archive action)
  drafts/          — outbound drafts staged for review before push to Gmail
  ```

- [ ] Scaffold `.flowdeck/.emaildeck/ACTIONS.md` if it does not already exist:
  ```markdown
  # Email Actions

  Reference for all actions available on email cards.
  To activate an action, move it from `## ACTIONS` in the card's `TODO.md` into `## BOT` (bot executes) or `## HUMAN` (you handle it).

  ---

  ## fetch-emails

  Fetch matching messages from the provider (Gmail or Outlook), apply the filter's label/category, and create `EMAIL.md` + `TODO.md` cards under `mail-inbox/`.

  **Trigger:** `- [ ] fetch-emails` on a filter card (under `.flowdeck/.emaildeck/filters/<slug>/TODO.md`)

  When activated:
  1. Read the filter slug from the card's folder name.
  2. Run: `node .flowdeck/.emaildeck/_scripts/emaildeck_run.js --filter <slug>` (use canonical path, or legacy flat path if that's what's installed — see `emaildeck-init`).
  3. The runner reads `FILTER.md` for provider, query, label, date range, and default tasks.
  4. New message cards are created in `mail-inbox/<YYYY-MM-DD>-<slug>/`.
  5. Run Log in `FILTER.md` is updated automatically.

  ---

  ## schedule-inboxing

  Install a recurring trigger so the `mail-inbox/` sweep runs on its own, instead of being played by hand. Recurrence is a reminder in the card's frontmatter, not something flowdeck enforces — this action wires an actual scheduler. Pick whichever fits the host:

  **Option A — crontab** (simplest; the machine is usually on):
  ```cron
  # every morning at 07:00 — adjust cadence to taste
  0 7 * * * cd /absolute/path/to/repo && flowdeck play mail-inbox >> .flowdeck/.emaildeck/_digests/inbox-cron.log 2>&1
  ```
  Add with `crontab -e`. Use an absolute repo path; `flowdeck play mail-inbox` resolves the bare leaf from the deck root.

  **Option B — scheduled agent** (headless/cloud, no always-on machine): register a scheduled job (e.g. a Claude Code routine or CI cron) that runs `flowdeck play mail-inbox` in the repo on the desired cadence. The card's `recurrence:` value is the suggested rhythm to mirror.

  **Trigger:** `- [ ] schedule-inboxing` on the `mail-inbox/` instrument card. When activated, propose the crontab line (Option A) or scheduled-agent config (Option B) under `## HUMAN` for the operator to install — do not edit the system crontab or register cloud jobs automatically.

  ---

  ## summarize-inbox

  Mint a dated **thematic-summary card** from the email cards in `mail-inbox/` — a structured synthesis instead of an inline prose report. Distinct from `emaildeck-digest` (which fetches unread newsletters from the mailbox and triages threads): this reads **already-fetched cards** and groups them by theme.

  When activated:
  1. Determine scope: cards in `mail-inbox/` not covered by the previous summary (check the latest `_digests/*-summary/` card's linked list; first run covers everything).
  2. Read each card's `EMAIL.md`/`TODO.md` and the host's active-projects context (`AGENT.md` / root `CLAUDE.md`) as the relevance target.
  3. Scaffold `.flowdeck/.emaildeck/_digests/<YYYY-MM-DD>-summary/TODO.md` from `_energy-cards/SUMMARY.md.template`: fill the Inputs table (period, filters, card counts, link to previous summary), one `### Theme` block per theme (synthesis + project relevance + linked card list), and the Noise list. **Every card read must appear exactly once** — in a theme or under Noise; each entry links back to its source card.
  4. Report the card path and theme count under `## HUMAN` of the `mail-inbox/` card; the human triages follow-ups (deep-dive / card-to-deck / archive) on the summary card itself.

  **Trigger:** `- [ ] summarize-inbox` on the `mail-inbox/` instrument card (run it after the sweep steps, so new cards are included).

  ---

  ## process-inbox

  Bulk-execute the **activated** message cards in `mail-inbox/` — the batch counterpart to playing each message card by hand. A standing step on the `mail-inbox/` instrument card, so every inbox play both fetches new mail and executes what the human has already activated.

  When activated:
  1. List message card subdirectories under `mail-inbox/` (each has an `EMAIL.md` + `TODO.md`).
  2. Skip every card whose `## BOT` has no unchecked items — an empty `## BOT` with a populated `## ACTIONS` is a dormant menu awaiting human activation (quarantine rule; never execute `## ACTIONS` items directly).
  3. For each remaining card, execute its unchecked `## BOT` items inline per this file's action definitions, check each off with a one-line `>` note, and honor per-action guards (e.g. `send-to-creamdeck`'s empty-body abort). Execute in place — never spawn flowdeck subcommands (`play`/`turn`) from inside a play.
  4. On a per-card failure, record it under that card's `## HUMAN` and continue with the remaining cards.
  5. Report the processed cards and the actions executed per card under `## HUMAN` of the `mail-inbox/` card.

  **Trigger:** `- [ ] process-inbox` on the `mail-inbox/` instrument card (standing by default; runs after the filter sweep so cards minted this run are included once activated).

  ---

  ## process-drafts

  Bulk-execute the **activated** draft cards in `drafts/` — the batch counterpart to playing each draft card by hand. A standing step on the `drafts/` instrument card, ordered before the standing push program so content edits land before a draft reaches Gmail.

  When activated:
  1. List draft card subdirectories under `drafts/` (compose drafts have a `MESSAGE.md`, reply drafts an `EMAIL.md` + drafted reply; each has a `TODO.md`).
  2. Skip every card whose `## BOT` has no unchecked items — an empty `## BOT` with a populated `## ACTIONS` is a dormant menu awaiting human activation (quarantine rule; never execute `## ACTIONS` items directly).
  3. For each remaining card, execute its unchecked `## BOT` items inline per this file's action definitions (e.g. `improve-language`, `push-to-gmail`), check each off with a one-line `>` note.
  4. On a per-card failure, record it under that card's `## HUMAN` and continue with the remaining cards.
  5. Report the processed cards and the actions executed per card under `## HUMAN` of the `drafts/` card.

  **Trigger:** `- [ ] process-drafts` on the `drafts/` instrument card (standing by default; the instrument's own push steps still run afterwards and skip drafts already pushed).

  ---

  ## score-relevance

  For each new `EMAIL.md` created by the last `fetch-emails` run, read `.flowdeck/.crunchdeck/profile/PROFILE.md` and append a `## Relevance` section scoring the thread's relevance to the product in one sentence. Skip silently if `.crunchdeck/` does not exist.

  **Trigger:** `- [ ] score-relevance` on a filter card

  ---

  ## apply-enrichment

  For each new `EMAIL.md` created by the last `fetch-emails` run, apply the steps in `FILTER.md`'s `## Enrichment` section to that `EMAIL.md`. Skip silently if `## Enrichment` is blank.

  **Trigger:** `- [ ] apply-enrichment` on a filter card

  ---

  ## summarize

  Summarize the thread and append the summary to `EMAIL.md`.

  **Trigger:** `- [ ] summarize`

  ---

  ## draft-reply

  Compose a reply draft based on this thread and save it to `drafts/<slug>/MESSAGE.md`.
  Instructions after the `—` are optional — omit them to let the bot draft from context, or add them to specify tone, content, or constraints (e.g. `decline politely`, `ask for a call next week`).
  After the draft is saved, open `drafts/<slug>/TODO.md` and move `push-to-gmail` into `## BOT` to push it to Gmail.

  **Trigger:** `- [ ] draft-reply` — bot drafts from thread context
  **Trigger:** `- [ ] draft-reply — [instructions, e.g. "confirm the meeting" or "ask for the invoice"]`

  ---

  ## improve-language

  Rewrite an existing draft in `drafts/` with improved clarity, tone, or style.

  **Trigger:** `- [ ] improve-language — [target tone, e.g. "more concise" or "formal"]`

  ---

  ## create-card

  Create a flowdeck card for this email thread as a work item to follow up on.

  **Trigger:** `- [ ] create-card`

  ---

  ## extract-tasks

  Extract action items from the email body and append them as tasks under `## HUMAN`.

  **Trigger:** `- [ ] extract-tasks`

  ---

  ## label

  Apply a Gmail label to the thread.

  **Trigger:** `- [ ] label — [label name]`

  ---

  ## forward

  Forward the thread to another address with optional context.

  **Trigger:** `- [ ] forward — [recipient and any context]`

  ---

  ## translate

  Translate the email body into another language and append to `EMAIL.md`.

  **Trigger:** `- [ ] translate — [target language]`

  ---

  ## snooze

  Add a follow-up reminder as a `## HUMAN` task with a target date.

  **Trigger:** `- [ ] snooze — [date or condition, e.g. "in 3 days" or "after reply"]`

  ---

  ## archive

  Mark the thread as read and archive it in Gmail, then move this message card's folder from `mail-inbox/<...>/` to the `mail-archive/<...>/` pile (create `mail-archive/` if missing). Provenance is preserved — `EMAIL.md` still records the thread ID and the label applied, so the matching filter is recoverable without folder nesting.

  **Trigger:** `- [ ] archive`

  ---

  ## mark-to-delete

  Apply the `emaildeck/DELETE` label to the thread in Gmail, then delete this message card's local folder. Use for mail confirmed as junk.

  **Trigger:** `- [ ] mark-to-delete`

  When activated:
  1. Read the thread ID from this card's `EMAIL.md`.
  2. Ensure the `emaildeck/DELETE` label exists — list labels and create if missing: `curl -s -X POST -H "Authorization: Bearer ACCESS_TOKEN" -H "Content-Type: application/json" -d '{"name":"emaildeck/DELETE"}' "https://www.googleapis.com/gmail/v1/users/me/labels"`.
  3. Apply the label: `curl -s -X POST -H "Authorization: Bearer ACCESS_TOKEN" -H "Content-Type: application/json" -d '{"addLabelIds":["LABEL_ID"]}' "https://www.googleapis.com/gmail/v1/users/me/threads/THREAD_ID/modify"`.
  4. **Only after the label call succeeds**, delete this message card's local folder (the `<YYYY-MM-DD>-<thread-slug>/` directory under `mail-inbox/`). If the label call fails, do NOT delete the folder — note the failure under `## HUMAN` so the card survives for retry.

  Can also be set as a filter default via `BOT: mark-to-delete` in a filter's `## Default Tasks`, for filters whose mail is reliably junk.

  ---

  ## send-to-creamdeck

  Forward this email card to the creamdeck contact inbox for triage. Creates a card at `.flowdeck/.creamdeck/creamdeck-inbox/<YYYY-MM-DD>-<thread-slug>/`. Only runs if `.flowdeck/.creamdeck/` exists — stops silently otherwise.

  **Trigger:** `- [ ] send-to-creamdeck`

  **Guard — skip if body is empty:** Before doing anything else, read `## Body` in `EMAIL.md`. If it is blank (whitespace only or absent), mark this task as skipped, note under `## HUMAN` that the email was skipped due to empty body, and stop. Do NOT create a creamdeck card from subject line alone — an empty body means the content was not fetched and any ticket created from it would be unreliable.

  When activated:
  1. Check `.flowdeck/.creamdeck/` exists — if not, note under `## HUMAN` and stop.
  2. Read `EMAIL.md` — **abort if `## Body` is blank** (see guard above).
  3. Read subject, sender, date, and full body.
  4. Create `.flowdeck/.creamdeck/creamdeck-inbox/<YYYY-MM-DD>-<thread-slug>/EMAIL.md` — copy all metadata including body.
  5. Create `.flowdeck/.creamdeck/creamdeck-inbox/<YYYY-MM-DD>-<thread-slug>/TODO.md`:
     ```
     # [Subject]

     ## BOT

     ## HUMAN

     ## ACTIONS

     <!-- Move an item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

     - [ ] open-ticket — open a new ticket card in `.creamdeck/tickets/`
     - [ ] log-to-contact — append this thread to an existing contact card
     - [ ] draft-reply
     - [ ] archive

     #### COMMENTS
     ```

  ---

  ## send-to-crunchdeck

  Forward this email card to the crunchdeck product inbox for triage. Creates a card at `.flowdeck/.crunchdeck/crunchdeck-inbox/<YYYY-MM-DD>-<thread-slug>/`. Only runs if `.flowdeck/.crunchdeck/` exists — stops silently otherwise.

  **Trigger:** `- [ ] send-to-crunchdeck`

  When activated:
  1. Check `.flowdeck/.crunchdeck/` exists — if not, note under `## HUMAN` and stop.
  2. Read `EMAIL.md` for subject, sender, date, snippet, and `## Relevance` note (if present).
  3. Create `.flowdeck/.crunchdeck/crunchdeck-inbox/<YYYY-MM-DD>-<thread-slug>/EMAIL.md` — copy all metadata and relevance note.
  4. Create `.flowdeck/.crunchdeck/crunchdeck-inbox/<YYYY-MM-DD>-<thread-slug>/TODO.md`:
     ```
     # [Subject]

     ## BOT

     ## HUMAN

     ## ACTIONS

     <!-- Move an item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

     - [ ] to-backlog — append as a candidate item in `../../backlog/BACKLOG.md`
     - [ ] to-roadmap — promote directly to `../../roadmap/ROADMAP.md` under the relevant horizon
     - [ ] to-decision — open a new ADR: `flowdeck blueprint use crunchdeck-adr <slug>`
     - [ ] discard

     #### COMMENTS
     ```

  ---

  ## push-to-gmail

  Read this draft card's `MESSAGE.md` (To / Cc / Bcc / Subject metadata table + `## Body`). Authenticate via `~/.config/flowdeck/tokens/google.json` (refresh if expired). Encode the message as RFC 2822 base64url and POST to `https://www.googleapis.com/gmail/v1/users/me/drafts`. Write the returned draft ID into the `Gmail draft ID` row of `MESSAGE.md`. The local `.md` remains the source of truth — this only pushes a copy to Gmail.

  **Trigger:** `- [ ] push-to-gmail`

  ---

  <!-- Add your own actions below -->
  ```

- [ ] Scaffold `.flowdeck/.emaildeck/drafts/mock-email-card/EMAIL.md` if it does not already exist:
  ```markdown
  # Email: [Subject here]

  | Field | Value |
  |-------|-------|
  | From | sender@example.com |
  | Date | YYYY-MM-DD |
  | Thread ID | <!-- Gmail thread ID --> |
  | Label applied | <!-- emaildeck/label --> |
  | Filter | <!-- filter slug --> |

  ## Snippet

  <!-- First lines of the thread -->

  ## Thread URL

  https://mail.google.com/mail/u/0/#inbox/THREAD_ID
  ```

- [ ] Scaffold `.flowdeck/.emaildeck/drafts/mock-email-card/TODO.md` if it does not already exist:
  ```markdown
  # [Subject here]

  ## BOT

  ## HUMAN

  ## ACTIONS

  <!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate -->

  - [ ] summarize
  - [ ] draft-reply — [describe what the reply should say]
  - [ ] improve-language — [target tone, e.g. "more concise" or "formal"]
  - [ ] create-card
  - [ ] extract-tasks
  - [ ] label — [label name]
  - [ ] forward — [recipient and context]
  - [ ] translate — [target language]
  - [ ] snooze — [date or condition]
  - [ ] archive
  - [ ] mark-to-delete

  #### COMMENTS
  ```

- [ ] Scaffold `.flowdeck/.emaildeck/drafts/mock-compose-card/MESSAGE.md` if it does not already exist:
  ```markdown
  # [Subject here]

  | Field | Value |
  |-------|-------|
  | To | recipient@example.com |
  | Cc |  |
  | Bcc |  |
  | Subject | [Subject here] |
  | Gmail draft ID | <!-- populated by push-to-gmail; empty until pushed --> |

  ## Body

  <!-- Write your message here -->
  ```

- [ ] Scaffold `.flowdeck/.emaildeck/drafts/mock-compose-card/TODO.md` if it does not already exist:
  ```markdown
  # [Subject here]

  ## BOT

  ## HUMAN

  Author / edit the message in `MESSAGE.md`. When ready, move `push-to-gmail` into `## BOT` to create the Gmail draft.

  ## ACTIONS

  <!-- Move an item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

  - [ ] improve-language — [target tone, e.g. "more concise" or "formal"]
  - [ ] push-to-gmail

  #### COMMENTS
  ```

- [ ] Scaffold `.flowdeck/.emaildeck/mail-inbox/mock-email-card/EMAIL.md` if it does not already exist — same structure as the drafts mock:
  ```markdown
  # Email: [Subject here]

  | Field | Value |
  |-------|-------|
  | From | sender@example.com |
  | Date | YYYY-MM-DD |
  | Thread ID | <!-- Gmail thread ID --> |
  | Label applied | <!-- emaildeck/label --> |
  | Filter | <!-- filter slug --> |

  ## Snippet

  <!-- First lines of the thread -->

  ## Thread URL

  https://mail.google.com/mail/u/0/#inbox/THREAD_ID
  ```

- [ ] Scaffold `.flowdeck/.emaildeck/mail-inbox/mock-email-card/TODO.md` if it does not already exist — same structure as the drafts mock:
  ```markdown
  # [Subject here]

  ## BOT

  ## HUMAN

  ## ACTIONS

  <!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate -->

  - [ ] summarize
  - [ ] draft-reply — [describe what the reply should say]
  - [ ] improve-language — [target tone, e.g. "more concise" or "formal"]
  - [ ] create-card
  - [ ] extract-tasks
  - [ ] label — [label name]
  - [ ] forward — [recipient and context]
  - [ ] translate — [target language]
  - [ ] snooze — [date or condition]
  - [ ] archive
  - [ ] mark-to-delete

  #### COMMENTS
  ```

- [ ] Scaffold `.flowdeck/.emaildeck/filters/mock-filter-card/FILTER.md` if it does not already exist:
  ```markdown
  # Filter: Example Filter

  ## Query

  ```
  from:example@example.com
  ```

  ## Label

  emaildeck/example

  ## To Domain

  ## Default Tasks

  > Tasks below are added to every message card this filter creates.
  > Prefix with `BOT:` or `HUMAN:` — unprefixed defaults to HUMAN.

  BOT: summarize
  - [ ] archive

  ## Enrichment

  ## Date Range

  ## Run Log

  | Date | Threads found | Labeled | Cards created |
  |------|--------------|---------|---------------|
  ```

- [ ] Scaffold `.flowdeck/.emaildeck/filters/mock-filter-card/TODO.md` if it does not already exist — user plays card to activate actions:
  ```markdown
  # Example Filter

  ## BOT

  ## HUMAN

  ## ACTIONS

  <!-- Move an item to ## BOT, then play this card to activate it. -->

  - [ ] fetch-emails — fetch matching messages from provider, apply label/category, create EMAIL.md cards
  - [ ] score-relevance — if .flowdeck/.crunchdeck/profile/PROFILE.md exists, append ## Relevance to each EMAIL.md
  - [ ] apply-enrichment — if FILTER.md has ## Enrichment section, apply those steps to each EMAIL.md

  #### COMMENTS
  ```

- [ ] Scaffold `.flowdeck/.emaildeck/AGENT.md` if it does not already exist — copy verbatim from `_energy-cards/emaildeck-AGENT.md`.

- [ ] Commit **only if this replay changed anything** (a repair replay on an already-scaffolded project produces no diff): `git add .flowdeck/.emaildeck && git diff --cached --quiet || git commit -m "deck: init emaildeck"`.

- [ ] **Hand off to setup.** Structure is now in place but no filters exist yet. Print, on its own line, the next step for a fresh instance: `next → flowdeck play emaildeck-setup` (establish filters + first backfill). On a repair replay of an already-configured instance, note that setup is only needed to add or repair filters.

## HUMAN

#### COMMENTS
