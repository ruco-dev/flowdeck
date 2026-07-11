# Card sending

Structured card exchange between decks, users, and bots. A **completion record** — a card describing already-done work — is *sent* from a sending deck into a receiving project's `_inbox/` pile, where it waits (quarantined) until the receiver **melds** it, folding its slice into that project's release notes / public docs.

It solves the immediate doc-drift problem — code interventions run in the `ruco-dev` global deck while each project's melds are the release-notes source of truth — and seeds the future messaging layer. Full design and the recovered invariants live in the campaign's `SPEC.md` (machine-local, gitignored deck).

- **Template-repo scope (this repo):** the formats and docs below, plus the release gate in crunchdeck's `publish-readiness-audit`.
- **CLI / runtime scope (satellite `flowdeck-cli`):** `flowdeck send`, `flowdeck inbox [--gate]`, board-level `_inbox/` scaffolding, quarantine enforcement in `playCommand`, throttled inbox check, exchange-repo transport (v2). Already shipped for v1.

## Placement — board level only

The `_inbox/` pile lives at the **board root** (`.flowdeck/_inbox/`), never inside a deck (`.flowdeck/.<deck>/`). A received card is addressed to a *project*, and the human abstracts afterward whether it relates to a specific deck. Decks therefore ship **no `_inbox/` scaffold** — the pile is created by the CLI's base-deck init, and its INBOX.md / SENT.md are CLI-generated to the formats below.

This keeps the underscore invariant intact (`_inbox` is a pile, never a playable column) and keeps deck templates free of transport concerns.

## Envelope frontmatter

Stamped on the card at send time; immutable afterward. On any later read, the receiver validates `to == self`.

| Field | Meaning |
|---|---|
| `from` | sending project (git-root name) |
| `to` | receiving project — `[@handle/]project`; unscoped = local sibling project |
| `sent` | ISO date the card was stamped and delivered |
| `kind` | `done-report` today; `request` reserved (see quarantine below) |
| `commits` | comma-separated SHAs the report describes (done-reports) |
| `campaign-home` | sender-side campaign folder that owns the work (optional back-pointer) |
| `received` | receiver-stamped delivery date (v2 remote transport only) |

> The `to:` field never changes meaning; only its **resolution** evolves — monorepo convention → exchange repo → future transports.

## INBOX.md format

One per board, at `.flowdeck/_inbox/INBOX.md`. The read checkbox is receiver-local and never closes delivery — **meld is the terminal step**.

```markdown
# INBOX — received cards

Read-checkbox is receiver-local and never closes delivery; meld is the terminal step (the release gate refuses while unmelded cards sit here).

| Read | Card | From | Kind | Sent | Status |
|---|---|---|---|---|---|
| [ ] | [slug](slug/TODO.md) | <from> | <kind> | <sent> | <status> |
```

## SENT.md format

One per board, at `.flowdeck/SENT.md` — the sender-side outbound ledger. A row flips `open → melded` when the receiver melds the card (v1: local meld updates the sender's ledger; v2: refreshed from the exchange repo).

```markdown
# Sent

| Slug | To | Sent | Status |
|------|----|------|--------|
| <sender>--<leaf>-<YYYYMMDD> | <project> | <sent> | open |
```

## Quarantine invariant

`_inbox/` is a **pile**, not a column:

- `turn` never plays `_inbox/` residents, and `flowdeck play <inbox-slug>` refuses them (CLI-enforced). Received cards are inert until acted on.
- `kind: done-report` cards are **melded** — read, folded into the receiver's docs / release notes, and closed. Read ≠ melded: the INBOX checkbox tracks reading; meld is a separate terminal act.
- `kind: request` cards (future) are never auto-played either; they require explicit human **accept / promotion** out of the pile before they become work.

## Release gate

Before a project releases, its board-level `_inbox/` must hold **no unmelded received cards** — a done-report describes work that has already landed and therefore belongs in *this* release's notes. crunchdeck's `publish-readiness-audit` ritual (§ Deck state) enforces this:

- **v1 (local):** `flowdeck inbox --gate` exits non-zero while residents exist. If the CLI helper is unavailable, degrade to a manual "is `.flowdeck/_inbox/` empty?" check.
- **v2 (remote):** an empty local folder proves nothing — hard-fail if the exchange repo is unreachable, then verify no undelivered cards are addressed here.

Any resident is a **blocker**: meld it before a READY verdict.

## Feature detection

No `_inbox/` pile → the feature does not exist for that board; flowdeck core is unchanged. Local sending needs zero GitHub. Remote (v2) activates only when an exchange repo is configured *and* `gh` is authenticated; until then `to: @handle/…` fails fast.

## Transports

- **v1 — local file move (shipped).** Deliver to `<git-root>/<to>/.flowdeck/_inbox/<sender>--<leaf>-<YYYYMMDD>/`; append the sender's `SENT.md` row; add the receiver's `INBOX.md` unread row. Refuses sub-deck targets (project only). Zero GitHub required.
- **v2 — GitHub Issues on a shared private exchange repo.** All cross-user cards are issues in one private exchange repo (`ruco-dev/ruco-dev-flowdeck`) where every participant is a collaborator. Identity = the `gh`-authenticated user. Pull-only sync, throttled inbox check (~15 min default). Gated on a real peer being ready to receive.

## Pointers

- Campaign home + `SPEC.md`: `.flowdeck/card-sending/` (machine-local, gitignored).
- CLI runtime: `flowdeck-cli/.flowdeck/_meld/card-sending/` (v1) and `_stock/card-sending-v2/` (v2).
