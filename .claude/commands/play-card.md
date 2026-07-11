Play a single flowdeck card.

The card slug is: $ARGUMENTS

The card is at `.flowdeck/<slug>/TODO.md`.

1. Read `.flowdeck/AGENT.md` (if it exists) and all `.flowdeck/.*/AGENT.md` files — installed deck instructions; follow them throughout this card.
2. Read the card.
3. Complete every unchecked `- [ ]` item under `## BOT` — read files, edit code, run commands as needed.
4. Mark each done `- [x]` with a one-line note indented with `>`.
5. If something needs the human, add `- [ ]` items under `## HUMAN`.
6. Commit: `git add -A && git commit -m "deck: <short description>"`.
7. Check if any project documents (README, AGENT.md, architecture notes, changelogs) need updating based on the changes you made. If so, update them and commit: `git add -A && git commit -m "docs: <short description>"`.

Do not scan or read any other TODO.md files.
