# Vigilance webhooks

AI-supervised subscriptions between decks. A deck that produces readable
content (a finding, a listing change, a fetched email, a CRM ticket) can be
**watched** by any other deck without either side hardcoding the other's name.
After a deck creates new content it calls one primitive — `scan_hooks` — which
reads the board's webhook registry and, for each matching subscription, asks a
model to judge relevance against a plain-English `Intent`. No keyword matching.
A match resolves the subscription's **action**:

| Action | What it does | Status |
|---|---|---|
| `unfreeze` | thaws a card parked pending exactly that condition | **shipped** |
| `alert` | delivers a copy of the content into a subscriber's `_inbox/` | **specified, not shipped** |

`unfreeze` is the capability with no substitute: it lets you park work on a
real-world condition and have it come back by itself when a deck the board
already runs happens to see proof. `alert` duplicates fan-out that
`send-to-crunchdeck` already does, and it alone depends on the card-sending
`_inbox/` transport — so it is specified here in full and deferred to v1.1. The
`Action` column and its `alert` value are part of the registry schema today, so
shipping it later is an addition, not a migration. **`flowdeck webhook
subscribe --action alert` refuses**: a row that can never fire would be a
silent no-op.

Read `CARD-SENDING.md` first for the `alert` transport — this doc only adds
what's new.

- **Template-repo scope (this repo):** the registry format, the envelope extension, the freeze record, and the one-line `scan_hooks` call every content-producing deck ships.
- **Runtime scope (`flowdeck-cli`):** `flowdeck webhook`, `flowdeck scan-hooks`, `flowdeck frozen --until`, the judge call, and the `system:*` pollers (v1.1).

## Why not keywords

A 2000s-style keyword watch on "price" or "listing" either fires on every
unrelated mention or misses a rewrite that changes the same fact in different
words. Every finding card in this repo is already read by a model before it's
filed (gitdeck and webdeck both score findings against `PROFILE.md` — see
`gitdeck/AGENT.md` § Pipeline). Vigilance is the same read, aimed at a
subscriber's stated interest instead of the producer's own product context. The
registry's `Intent` field is prose because the judge is a model call, not a
`grep`.

## Registry — board level only

Like `_inbox/`, the registry lives at `.flowdeck/_webhooks/`, never inside a
deck. A subscription names a *deck* (or a reserved system source) as its
source, not a file or folder, so it survives that deck's internal refactors.

**Only the CLI writes `_webhooks/`.** Cards never hand-edit the table; every
mutation goes through `flowdeck webhook`, `flowdeck frozen --until` or
`flowdeck scan-hooks`, which take an advisory lock (`_webhooks/.lock`, stale
after 60s) and read-modify-write inside it. `turn` runs cards in parallel;
hand-edits would lose updates.

`.flowdeck/_webhooks/SUBSCRIPTIONS.md`:

```markdown
| Id | From | Action | To | For | Intent | Status | Created |
|----|------|--------|----|-----|--------|--------|---------|
| wh-001 | emaildeck | unfreeze | _frozen/renew-anthropic-contract | — | Fires when the Anthropic account plan changes to a paid/upgraded tier. | active | 2026-08-05 |
| wh-002 | webdeck | alert | self | sitedeck | Alert when a named competitor changes listing prices, adds a new service area, or launches a new listing type. Ignore general market commentary. | active | 2026-08-05 |
```

- **Id** — `wh-<NNN>`, zero-padded to three digits and allocated as `max + 1` **under the registry lock**. Stable for the subscription's life; alert envelopes and thaw notes reference it.
- **From** — the deck whose new content is watched. Unscoped = local deck on this board; `@handle/project:deck` scopes cross-board (v2); `system:<source>` scopes a non-deck signal (§ Non-deck signals).
- **Action** — `unfreeze` or `alert`. Determines what dispatch does on a match; nothing else in the row changes shape.
- **To** — what the action targets. For `unfreeze`, the frozen card's path under `.flowdeck/_frozen/`. For `alert`, a **project** — `[@handle/]project`, or `self` for this board — exactly the addressing `flowdeck pass` uses.
- **For** — optional, `alert` only: names the deck that cares. **It routes nothing.** There is one `_inbox/` per board, shared by every deck on it (`CARD-SENDING.md` § Placement makes board-level-only a decision, not an oversight). `For` is inert triage text carried in the envelope and repeated in the delivered card's first body lines, because `INBOX.md` is a checklist that shows no such column.
- **Intent** — free prose, the judge's only instruction. No operators, no keyword lists. Write it the way you'd brief a person: what would make you care (or, for `unfreeze`, what would make the condition true), and what wouldn't.
- **Status** — `active`, `paused`, `fulfilled`, or `blocked`. Paused rows are skipped by dispatch but kept for the audit trail; `flowdeck webhook rm` deletes a row outright. `unfreeze` rows are one-shot: a match flips them straight to `fulfilled`. `blocked` is a terminal state a human must clear (§ Action: unfreeze).

`.flowdeck/_webhooks/FIRED.md` is an append-only ledger of `(subscription,
content key, date)`. `scan_hooks` skips any pair already present **before** the
judge call, so replaying a card or re-fetching a message never fires twice —
and dedup doubles as a cost control. The content key is an explicit `--key`,
else the content document's own stable identity (`Message ID` for `EMAIL.md`),
else the card's path.

## Envelope extension

Alerts reuse the `CARD-SENDING.md` envelope with one new `kind` and three new
fields:

| Field | Meaning |
|---|---|
| `kind` | `vigilance-alert` — auto-generated by dispatch, never human-passed |
| `webhook` | the subscription `Id` that fired |
| `for` | the deck named in the row's `For` column — a hint, routes nothing |
| `judged-relevant-because` | one line, the judge's own rationale, so the human reviewing `_inbox/` doesn't re-derive why the card is there |

`INBOX.md` rows and quarantine rules are unchanged — a `vigilance-alert` is
inert until melded or discarded, exactly like a `done-report`.

> **Known limit (v1.1 work):** `receive` rebuilds the envelope from a fixed
> whitelist, so `for`, `webhook` and `judged-relevant-because` survive *local*
> delivery only and are dropped on the remote path — the same way `commits`
> already is for done-reports today. Fixing that (pass unknown keys through)
> is one change that repairs both features. Remote `alert` is v2.

## `scan_hooks` — the dispatch primitive

**The prose below specifies what the command does. It is not a second
implementation.** The canonical form is:

```
flowdeck scan-hooks --from <deck> --card <path> [--card <path> …]
```

A deck opts in with a single line wherever it already processes new content:

```markdown
- [ ] Run `flowdeck scan-hooks --from gitdeck --card <path to the new FINDING.md>` — see `VIGILANCE.md`. Opt-in and silent no-op if `.flowdeck/_webhooks/SUBSCRIPTIONS.md` doesn't exist.
```

One implementation, two callers — a played card *and* a script. That
distinction is load-bearing: emaildeck's producer is `emaildeck_run.js`, a
deterministic script that writes `EMAIL.md` directly and cannot make a model
call. A prose-only procedure would never fire on a cron run — precisely the
"the confirmation email arrives overnight" case the feature exists for. So the
runner shells out to the command after writing its batch.

`scan_hooks(from, content)` specification:

```markdown
If `.flowdeck/_webhooks/SUBSCRIPTIONS.md` does not exist, exit silently —
the feature is opt-in per board. Otherwise:
1. Collect `active` rows whose `From` equals `from`. None → exit.
2. Drop (row, content) pairs already in `FIRED.md`.
3. Cap content at `maxContentPerRun`, newest-first; note any truncation
   under `## HUMAN`.
4. For each remaining content, make ONE judge call covering ALL applicable
   rows, returning a verdict + one-line rationale per row Id.
5. On each "yes", resolve the row's `Action`:
   - `unfreeze` — run § Action: unfreeze, flip the row `fulfilled` or `blocked`.
   - `alert` — deliver per § Action: alert, leave the row `active`.
   Record the (row, content) pair in `FIRED.md`.
```

Any deck's `From` is a valid subscription source the moment that deck calls
`scan-hooks` — there is no separate registration step. Adding a caller
(calendardeck, creamdeck, farmdeck, …) is one line in that deck's own
new-content step, never a change to `scan_hooks` or to another deck's
templates.

This is additive, not a replacement for `send-to-crunchdeck` — content can both
route to crunchdeck's backlog *and* fan out to subscribers. Neither reads the
other's output; order doesn't matter.

### Caps and cost

Judging every (content × row) pair separately is what makes this expensive:
emaildeck at 50 messages × 5 subscriptions would be 250 model calls per fetch.
**Batching is the canonical form, not an optimisation** — one call per content,
all rows at once, which turns that worst case into 50. Cost then scales with
content volume only.

The judge runs on the `scan-hooks` entry in the board's agents table (`Casual`
by default — a bounded read returning yes/no plus a rationale, the same shape
`reviewer` already runs). Rebind per board with `flowdeck agents`, or override
per run with `--model`.

Three caps, configurable in `.flowdeck/webhooks.json`, merged over defaults:

| Key | Default | On breach |
|---|---|---|
| `maxContentPerRun` | 25 | judge newest-first, truncate, report the skipped count |
| `maxRowsPerFrom` | 10 | `webhook subscribe` refuses the 11th row for that `From` |
| `snippetThresholdBytes` | 8192 | above this, judge the content's snippet/summary field instead of the full body |

`--dry-run` prints what would be judged and takes no action — the reviewable
path for tuning an `Intent` before it can act on anything.

## The freeze pile

Freezing uses the **existing** `_frozen/` pile and the existing `flowdeck
frozen` verb — there is no `_freeze/` pile and no `freeze` command. A frozen
card is a normal card folder moved into `.flowdeck/_frozen/<slug>/`, plus a
`FREEZE.md` record beside its `TODO.md`:

```markdown
# Freeze Record

**Frozen:** 2026-08-05
**Frozen from:** .flowdeck/renew-anthropic-contract
**Webhook:** wh-001
**User note:** waiting on the plan upgrade

## Blocking Condition
…

## Unfreeze Signal
Fires when the Anthropic account plan changes to a paid/upgraded tier.
```

`**Frozen from:**` is the restore path. `**Webhook:**` is the `unfreeze` row
watching it, or `—` when there is none. `_frozen/FROZEN.md` carries a matching
`Webhook` column.

### Two kinds of freeze, and why only one auto-thaws

```bash
flowdeck frozen <card> -m "<note>"                          # bot-derived signal
flowdeck frozen <card> --until "<condition>" --from <deck>  # human-authored condition
```

Without `--until`, a model reads the card and the note and *infers* an
`## Unfreeze Signal`. That signal is the bot's own guess, so acting on it would
be a bot grading its own inference: `turn` flags such cards under `## HUMAN`
and stops. **No webhook row is minted.**

With `--until`, the condition is the human's own sentence. It is stamped
**verbatim** into both `## Unfreeze Signal` and the subscription's `Intent`, no
analysis model is spawned, and no later pass may rewrite or "improve" it — the
entire authority of the automatic path is that the words being judged are the
human's. That freeze mints an `unfreeze` row, and `scan-hooks` may thaw it
automatically.

The rule is a **lookup, never a judgement**: the carve-out is "an active
`SUBSCRIPTIONS.md` row minted from a human `--until`", not "the condition looks
human-written". A model must never have to assess provenance. See
`flowdeck-cli/docs/adr/2026-08-06-vigilance-auto-unfreeze.md` (ADR-0008).

`--until` requires `--from`: the deck whose content could prove the condition.
Inferring it would need the very model call `--until` exists to avoid, and a
confirmation prompt would hang a headless run. A card already carrying a live
unfreeze subscription is never layered with a second one.

### Action: unfreeze

Run against the card at the subscription's `To` path once its `Intent` is
judged true:

1. Read `**Frozen from:**` — the restore path.
2. If nothing occupies it, move the card folder back. If something does (a
   same-named card was created while this one was frozen), **never clobber**:
   leave the card in `_frozen/`, note the collision once under its `## HUMAN`,
   and flip the row to `blocked`. `blocked` rows are skipped by dispatch and
   surfaced first by `flowdeck webhook list`; the human resolves the clash and
   re-arms with `flowdeck webhook resume <Id>`. (Leaving it `active` instead
   would make every later pass re-judge and re-append the same note — a
   livelock.)
3. On a clean restore, **announce the thaw**: append to the card's own
   `#### COMMENTS` the thaw date, the subscription `Id`, and the judge's
   one-line rationale, and add a `## HUMAN` item asking the human to verify the
   condition really held. Silent automation is what would make this expensive
   to reverse; an announced one is a flag with the work already done.
4. Delete `FREEZE.md`, remove the `FROZEN.md` row, flip the subscription to
   `fulfilled`. The card is an ordinary playable resident again.

Bringing a frozen card back by hand (`flowdeck bring`) **pauses** its unfreeze
row — a stale `active` row would aim `scan-hooks` at a card that is no longer
frozen. Paused, not fulfilled: the condition never actually fired.

### Action: alert — *specified, not shipped*

On a "yes", stamp the envelope (`kind: vigilance-alert`, `webhook`, `for`,
`judged-relevant-because`) and deliver into the `To` project's board-level
`_inbox/`. No `PASSED.md` row — a dispatch is not a hand-off.

Delivery is a **copy**: the source deck always keeps its card. A dispatch that
moved the producer's own output would be indefensible. What lands is the
envelope, the content document inlined, and a `Source:` back-pointer — with two
subtractions:

- the source card's `## ACTIONS` block is **stripped**. Those actions are defined by the source deck's `ACTIONS.md` and are meaningless, or actively misleading, elsewhere (an emaildeck message card carries `archive` / `draft-reply` / `send-to-creamdeck`; none of them mean anything in another project's inbox). Quarantine already prevents *play*; this prevents a human reading a menu that cannot work.
- any open `- [ ]` under `## BOT` / `## HUMAN` is **flattened to prose**. The delivered artifact is a report; `meld` is the receiver's only checkbox.

A one-line `> source card's ACTIONS omitted — act at the source` is left in
place so nobody reads the copy as complete.

### Choosing `From` when you freeze a card

Pick a deck first; a `system:` source only as a last resort. Ask "which deck,
in its normal course of business, would ever see content that proves this
condition?" — that is almost always the answer:

- "until the Anthropic account upgrades" → `emaildeck` (the confirmation email).
- "until the competitor ships v2" → `gitdeck` or `webdeck`, whichever already watches that repo or search.
- "until this deal closes" → `creamdeck`, if it is already tracking the ticket.

Only reach for `system:<source>` when no deck plausibly encounters the
condition at all — a local filesystem check, an env var, something no deck's
normal scan would surface.

### Non-deck signals

For that genuine edge case, `From` uses a reserved `system:<source>` namespace
(`system:env`, `system:disk`, …) instead of a deck name. A `system:` source has
no deck behind it: it is a periodic CLI-native check that polls local state,
wraps what it finds as content, and calls `scan_hooks` the same as any deck
would. The command is **`flowdeck webhook poll`** — a sibling of `flowdeck
inbox`, not a freeze-specific verb, because it feeds `scan_hooks` generally.
**v1.1; not implemented.** Template scope stops at the reserved namespace and
the calling convention.

## Feature detection

No `.flowdeck/_webhooks/` → the feature does not exist for that board;
`scan-hooks` exits silently and costs nothing. The registry scaffolds lazily on
the first `flowdeck webhook subscribe` or the first `flowdeck frozen --until`,
the same way `_inbox/` scaffolds on the first `flowdeck pass`. `flowdeck init`
does **not** create it: `_webhooks/` holds no cards, and every column scan
already skips `_`-prefixed directories, so it needs no registration to stay out
of turns.

## Rollout

- **v1 — same-board `unfreeze` (shipped).** `From` is a local deck, `To` is a `_frozen/` path. Pure file operations plus one judge call; zero network.
- **v1.1 — `alert` (specified above, not shipped).** Needs the card-sending `_inbox/` transport on `flowdeck-cli` master. Also `flowdeck webhook poll` for `system:*` sources.
- **v2 — cross-board subscriptions.** `From: @handle/project:deck` resolves through the exchange-repo transport `CARD-SENDING.md` v2 defines for `to:`. Needs a real peer with `gh` authenticated. **`unfreeze` stays board-local even in v2 — a frozen card is never someone else's to thaw.**

## Pointers

- Transport, envelope base fields, quarantine and meld mechanics: `CARD-SENDING.md`
- Auto-thaw provenance rule and its rejected alternatives: `flowdeck-cli/docs/adr/2026-08-06-vigilance-auto-unfreeze.md` (ADR-0008)
- Reference callers: `decks/emaildeck/`, `decks/gitdeck/`, `decks/webdeck/`
