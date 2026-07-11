Create a card for recent work that has no card yet, then meld it.

Arguments (optional): $ARGUMENTS — a description or title hint. If omitted, infer from recent git commits and conversation context.

## What this command does

It covers undocumented work: changes already implemented, committed, and shipped — but never written up as a flowdeck card. It creates the card with all tasks pre-marked `[x]`, then immediately moves it to `_meld/` with a timestamp.

## Steps

1. **Identify the work.** If $ARGUMENTS is provided, use it as the scope. Otherwise, look at recent git commits (`git log --oneline -20`) and the current conversation to identify what was implemented and never captured in a card.

2. **Check for an existing card.** Scan `.flowdeck/` (all columns) and `.flowdeck/_meld/` for a card that already covers this work. If one exists, stop and tell the user — no duplicate.

3. **Choose a slug.** Derive a kebab-case slug from the work description (e.g. `emaildeck-outlook-support`, `auth-refactor`). Column is always `inbox`.

4. **Write the card.** Create `.flowdeck/inbox/<slug>/TODO.md`:
   - Title heading matching the slug
   - `<!-- lifecycle: one-shot -->`
   - One-line description of what was done
   - `## BOT` — empty (no open tasks)
   - `## HUMAN` — empty
   - `## OUTCOME` — bullet groups per area of work, all items pre-marked `- [x]`. Each item describes one concrete change: file modified, bug fixed, decision made, instance synced. Be specific — file paths, function names, commit messages are good anchors.

5. **Commit the card.** `git add -A && git commit -m "deck: add <slug> card"`

6. **Meld it.** Move `.flowdeck/inbox/<slug>/` to `.flowdeck/_meld/<slug>-<YYYYMMDDHHMMSS>/`. Commit: `git add -A && git commit -m "deck: meld <slug>"`.

7. **Report.** Tell the user what was captured and the meld path.
