# Card passing

Structured card exchange between decks, users, and bots. A **completion record** — a card describing already-done work — is *passed* from one deck into a receiving project's `_inbox/` pile, where it waits (quarantined) until the receiver **melds** it, folding its slice into that project's release notes / public docs.

It solves the immediate doc-drift problem — code interventions run in the `ruco-dev` global deck while each project's melds are the release-notes source of truth — and seeds the future messaging layer. Full design and the recovered invariants live in the campaign's `SPEC.md` (machine-local, gitignored deck).

- **Template-repo scope (this repo):** the formats and docs below, plus the release gate in crunchdeck's `publish-readiness-audit`.
- **CLI / runtime scope (satellite `flowdeck-cli`):** `flowdeck pass` (was `send`), `flowdeck receive` (was `fetch`), `flowdeck inbox [--gate]`, board-level `_inbox/` scaffolding, quarantine enforcement in `playCommand`, throttled inbox check, exchange-repo transport (v2). Already shipped for v1.

## Placement — board level only

The `_inbox/` pile lives at the **board root** (`.flowdeck/_inbox/`), never inside a deck (`.flowdeck/.<deck>/`). A received card is addressed to a *project*, and the human abstracts afterward whether it relates to a specific deck. Decks therefore ship **no `_inbox/` scaffold** — the pile is created by the CLI's base-deck init, and its INBOX.md / PASSED.md are CLI-generated to the formats below.

This keeps the underscore invariant intact (`_inbox` is a pile, never a playable column) and keeps deck templates free of transport concerns.

## Envelope frontmatter

Stamped on the card at pass time; immutable afterward. On any later read, the receiver validates `to == self`.

| Field | Meaning |
|---|---|
| `from` | passing project (git-root name) |
| `card` | the original card's name (slugified) — the receiver names its `_inbox/` resident after it |
| `to` | receiving project — `[@handle/]project`; unscoped = local sibling project |
| `passed` | ISO date the card was stamped and passed |
| `kind` | `done-report` today; `request` reserved (see quarantine below) |
| `commits` | comma-separated SHAs the report describes (done-reports) |
| `campaign-home` | passer-side campaign folder that owns the work (optional back-pointer) |
| `received` | receiver-stamped receipt date (v2 remote transport only) |

> The `to:` field never changes meaning; only its **resolution** evolves — monorepo convention → exchange repo → future transports.
> `passed` was `sent` before the pass/receive rename; the receiver reads either.

## INBOX.md format

One per board, at `.flowdeck/_inbox/INBOX.md`. The read checkbox is receiver-local and never closes the hand-off — **meld is the terminal step**.

```markdown
# INBOX — received cards

Read-checkbox is receiver-local and never closes the hand-off; meld is the terminal step (the release gate refuses while unmelded cards sit here).

| Read | Card | From | Kind | Passed | Status |
|---|---|---|---|---|---|
| [ ] | [slug](slug/TODO.md) | <from> | <kind> | <passed> | <status> |
```

## PASSED.md format

One per board, at `.flowdeck/PASSED.md` — the passer-side outbound ledger. A row flips `open → melded` when the receiver melds the card (v1: local meld updates the passer's ledger; v2: refreshed from the exchange repo). Legacy boards may still carry a `SENT.md`; the CLI reads it as a fallback.

```markdown
# Passed

| Slug | To | Passed | Status |
|------|----|--------|--------|
| <card> | <project> | <passed> | open |
```

## Quarantine invariant

`_inbox/` is a **pile**, not a column:

- `turn` never plays `_inbox/` residents, and `flowdeck play <inbox-slug>` refuses them (CLI-enforced). Received cards are inert until acted on.
- `kind: done-report` cards are **melded** — read, folded into the receiver's docs / release notes, and closed. Read ≠ melded: the INBOX checkbox tracks reading; meld is a separate terminal act.
- `kind: request` cards (future) are never auto-played either; they require explicit human **accept / promotion** out of the pile before they become work.

## Meld mechanics

Meld is the **doc-revision moment** — the fold happens in the meld commit, not at release time. Deferred folding turns meld into a folder move and hollows the release gate, which exists precisely so the notes are already complete when a release starts.

Melding a `done-report` is one commit containing:

1. **Fold** — the card's slice appended to `CHANGELOG.md` under `## [Unreleased]`; `README.md` revised only when the reported work changes user-facing capability (new command, flag, deck). Most done-reports never touch it. Foreign-origin entries credit the envelope: the `from:` handle and `commits:` SHAs ride into the entry — git already credits the commit author, the changelog line adds the human-readable credit.
2. **Move** — the card folder relocated from `_inbox/` to the board's `_meld/<slug>-<YYYYMMDDHHMMSS>/`, same as own-work melds.
3. **Ledgers** — the `INBOX.md` row status flipped to `melded`; v1 also flips the passer's `PASSED.md` row (`open → melded`).

**Origin rule.** Local-origin cards fold directly on the default branch — a PR per meld is ceremony without a reviewer. Foreign-origin cards (v2, passed from another handle) fold via PR: the receiver is folding *someone else's claimed work* into their public docs, so meld is the review moment and the PR diff shows exactly what the passer's card put into the release notes.

**Source-of-truth split.** `_meld/` is the private narrative record — what was done and why, with `commits:` SHAs — and never publishes (`.flowdeck/` is gitignored in public repos). `CHANGELOG.md § Unreleased` is its public derivative, accumulated meld by meld. A release **promotes and verifies**; it never re-derives notes from the pile.

**Release-time reconciliation** — three records, checked pairwise (wired into crunchdeck's `publish-readiness-audit` § Docs drift and the CLI's default `release` sleeve card):

- commits since the last tag ↔ meld cards covering them (`commits:` envelope field where present) ↔ `## [Unreleased]` entries
- a commit no meld card covers is **undocumented work** — mint a pre-checked card and meld it (the `meld-card` command automates this)
- a meld with no `Unreleased` line is a **skipped fold** — a blocker, same class as an unmelded inbox resident

## Release gate

Before a project releases, its board-level `_inbox/` must hold **no unmelded received cards** — a done-report describes work that has already landed and therefore belongs in *this* release's notes. crunchdeck's `publish-readiness-audit` ritual (§ Deck state) enforces this:

- **v1 (local):** `flowdeck inbox --gate` exits non-zero while residents exist. If the CLI helper is unavailable, degrade to a manual "is `.flowdeck/_inbox/` empty?" check.
- **v2 (remote):** an empty local folder proves nothing — hard-fail if the exchange repo is unreachable, then verify no pending cards are addressed here.

Any resident is a **blocker**: meld it before a READY verdict.

## Feature detection

No `_inbox/` pile → the feature does not exist for that board; flowdeck core is unchanged. Local passing needs zero GitHub. Remote (v2) activates only when an exchange repo is configured *and* `gh` is authenticated; until then `to: @handle/…` fails fast.

## Transports

- **v1 — local file move (shipped).** Pass to `<git-root>/<to>/.flowdeck/_inbox/<card>/` (folder named after the original card, slugified; numeric `-2` suffix on collision); append the passer's `PASSED.md` row; add the receiver's `INBOX.md` unread row. Refuses sub-deck targets (project only). Zero GitHub required.
- **v2 — GitHub Issues on a shared private exchange repo.** All cross-user cards are issues in one private exchange repo (`ruco-dev/ruco-dev-flowdeck`) where every participant is a collaborator. Identity = the `gh`-authenticated user. Pull-only sync, throttled inbox check (~15 min default). Gated on a real peer being ready to receive.

## Pointers

- Campaign home + `SPEC.md`: `.flowdeck/card-sending/` (machine-local, gitignored).
- CLI runtime: `flowdeck-cli/.flowdeck/_meld/card-sending/` (v1) and `_stock/card-sending-v2/` (v2).
