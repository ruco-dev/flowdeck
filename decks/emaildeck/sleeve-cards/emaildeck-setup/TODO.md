---
lifecycle: ritual
recurrence: on-demand
---

# emaildeck-setup

> **Sleeve resident.** First-run setup ritual: it lives in the deck's own `_sleeve/` (`.flowdeck/.emaildeck/_sleeve/`), is played in place, and is never melded. `emaildeck-init` lays down structure; **this** card establishes filters and fetches the first mail. Replaying it **extends or repairs** the filter set — every step is create-if-missing, so a re-play never clobbers existing filters.
>
> Run order for a fresh instance: `flowdeck install emaildeck --local` (plays `emaildeck-init`) → `flowdeck play emaildeck-setup` (this card) → thereafter `flowdeck play mail-inbox` for recurring inboxing.

## BOT

- [ ] **Auth preflight.** Confirm `.flowdeck/.emaildeck/` exists — if not, stop and note under `## HUMAN` to run `flowdeck install emaildeck --local` (or `flowdeck play emaildeck-init`) first. Then check for a provider token:
  - Gmail: `~/.config/flowdeck/tokens/google.json`
  - Microsoft: `~/.config/flowdeck/tokens/microsoft.json`

  If neither exists, add a blocking item under `## HUMAN`: "Authenticate before filters can fetch — run `flowdeck auth google` (or `flowdeck auth microsoft`)", then stop after the context-detect step below (structure work can still proceed, but no fetch). If a token exists, note which provider is live and continue.

- [ ] **Context-detect filters.** Auto-provision filters the host's other decks imply, each create-if-missing (skip silently if the filter folder already exists):

  - **creamdeck contacts** — check `.flowdeck/.creamdeck/CREAMDECK.md` (relocated here from `emaildeck-init`).
    - If it does not exist, skip.
    - If it exists, read the `## Tracked Domains` table and collect all values from the `Domain` column (strip backtick wrappers). If no domains, skip.
    - Build `CREAMDECK_QUERY` by joining all domains: `(from:@domain1 OR from:@domain2 ...)`.
    - Scaffold `.flowdeck/.emaildeck/filters/creamdeck-contacts/FILTER.md` if it does not already exist — substitute `{CREAMDECK_QUERY}`:
      ```markdown
      # Filter: Creamdeck Contacts

      ## Query

      ```
      {CREAMDECK_QUERY}
      ```

      ## Label

      emaildeck/creamdeck-contacts

      ## To Domain

      ## Default Tasks

      > Tasks below are added to every message card this filter creates.
      > Prefix with `BOT:` or `HUMAN:` — unprefixed defaults to HUMAN.

      BOT: send-to-creamdeck

      ## Enrichment

      ## Date Range

      ## Run Log

      | Date | Threads found | Labeled | Cards created |
      |------|--------------|---------|---------------|
      ```
    - Scaffold `.flowdeck/.emaildeck/filters/creamdeck-contacts/TODO.md` if it does not already exist — same structure as `filters/mock-filter-card/TODO.md` but titled `# Creamdeck Contacts`.

  - **crunchdeck relevance** — check `.flowdeck/.crunchdeck/profile/PROFILE.md`. If present, note under `## HUMAN` that `BOT: score-relevance` is a recommended default task for filters minted below (threads get scored against the product profile). Do not force it — surface it as a suggestion for the interview.

- [ ] **Form → mint filters.** Read the filter blocks under `## HUMAN`. A block counts as filled when its **Name** line is answered; skip empty blocks. For each filled block, derive everything the human didn't have to write:
  - `slug` — kebab-case of the Name (`Client invoices` → `client-invoices`)
  - `label` — `emaildeck/<slug>`
  - provider — the mailbox ticked in the block; if none ticked, the (single) live provider from the auth preflight, else `gmail`
  - query — if the **Advanced** raw-query line is answered, use it verbatim and ignore the match fields. Otherwise compose it: each comma-separated **From** entry becomes `from:<entry>` OR-joined in parens; **Subject contains** terms become `subject:(term1 OR term2)`; **only unread** ticked appends `is:unread`. (Microsoft: translate to the Graph `$search` equivalent.) If a block has a Name but no match field and no raw query, note under `## HUMAN` "filter <name>: needs at least one match field" and skip it.
  - default tasks — the ticked task boxes map to `Default Tasks` lines (`BOT: summarize`, `BOT: draft-reply`, `archive`); none ticked = no default tasks. Add context-suggested tasks (e.g. `BOT: score-relevance` from the crunchdeck detect) only if their box was ticked.

  Then mint each via the blueprint rather than hand-writing the folder: `flowdeck blueprint use emaildeck-add-filter <slug>`, fill its `## HUMAN` from the derived values, and play it. If no block is filled and no context filter was provisioned above, note under `## HUMAN` that at least one filter is needed and stop — there is nothing to backfill.

- [ ] **First backfill fetch.** Play each **newly minted or newly provisioned** filter once with a wide date range so the initial sweep pulls history, not just the last 30 days. For each filter: set a `## Date Range` of `after: <YYYY/MM/DD>` (per the Backfill selection under `## HUMAN`; nothing marked = last year) in its `FILTER.md`, confirm `fetch-emails` sits in the filter's `## BOT` (newly minted filters ship it there — move it in from `## ACTIONS` only for older filters), and play it. Message cards land in `mail-inbox/`. Report threads-found per filter under `## HUMAN`. Skip filters that already have Run Log entries (they've been backfilled on a prior setup run).

- [ ] **Hand off.** Setup is complete. Print, on its own line, the recurring-inboxing entrypoint: `next → flowdeck play mail-inbox` (sweeps the established filters for new mail). Then remind the operator that recurring inboxing can be scheduled: move `schedule-inboxing` into `## BOT` on the `mail-inbox/` instrument card (crontab line or scheduled agent — see `ACTIONS.md`). The `mail-inbox/` card ships `recurrence: daily` as its intended rhythm.

## HUMAN

> Fill in the blanks, then play the card — the bot writes the actual queries, slugs, and labels from your answers. A block is used only if its **Name** is filled; leave the others blank. Duplicate a block if you need more than three. Context-detected filters (creamdeck contacts) are provisioned automatically and need no block here.

### Filter 1

- Name — what is this filter for? (e.g. `Client invoices`)
  > _answer:_
- Mailbox — mark one with `x` (blank = your connected account):
  - [ ] gmail
  - [ ] microsoft
- Match mail **from** — addresses or domains, comma-separated (e.g. `@client.com, billing@stripe.com`; blank = any sender):
  > _answer:_
- …whose **subject contains** — words or phrases, comma-separated (blank = any subject):
  > _answer:_
- [ ] only unread mail
- When a matching email is carded, the bot should — tick any:
  - [ ] summarize it
  - [ ] draft a reply
  - [ ] archive it after carding
- Advanced (optional) — raw provider query, overrides the match fields above:
  > _answer:_

### Filter 2

- Name:
  > _answer:_
- Mailbox — mark one with `x` (blank = your connected account):
  - [ ] gmail
  - [ ] microsoft
- Match mail **from** (comma-separated; blank = any sender):
  > _answer:_
- …whose **subject contains** (comma-separated; blank = any subject):
  > _answer:_
- [ ] only unread mail
- When a matching email is carded, the bot should — tick any:
  - [ ] summarize it
  - [ ] draft a reply
  - [ ] archive it after carding
- Advanced (optional) — raw provider query, overrides the match fields above:
  > _answer:_

### Filter 3

- Name:
  > _answer:_
- Mailbox — mark one with `x` (blank = your connected account):
  - [ ] gmail
  - [ ] microsoft
- Match mail **from** (comma-separated; blank = any sender):
  > _answer:_
- …whose **subject contains** (comma-separated; blank = any subject):
  > _answer:_
- [ ] only unread mail
- When a matching email is carded, the bot should — tick any:
  - [ ] summarize it
  - [ ] draft a reply
  - [ ] archive it after carding
- Advanced (optional) — raw provider query, overrides the match fields above:
  > _answer:_

### Backfill

- How far back should the first fetch reach? Mark one with `x` (blank = last year):
  - [ ] last 30 days
  - [ ] last 6 months
  - [ ] last year
  - [ ] last 3 years
  - [ ] everything

#### COMMENTS
