---
lifecycle: recurring
recurrence: on-demand
skills: content-digest
---

# emaildeck-digest

> **Newsletter digest ritual.** Fetch unread newsletters → distil per-project signals → human triage → execute the action map. On-demand; each play writes one dated digest to `.flowdeck/.emaildeck/_digests/`. Generalized from a retired internal `gmail-diggest` ritual; applies the `content-digest` skill. The `DELETE` label never physically deletes mail — bulk-delete stays a HUMAN action.

## BOT

- [ ] **Preflight.** Confirm `.flowdeck/.emaildeck/` exists — if not, stop and note under `## HUMAN` to run `emaildeck-init` first. Create `.flowdeck/.emaildeck/_digests/` if missing. Read the host project's **active-projects list** — the `## Our Projects` / active-projects section of this repo's `AGENT.md` (or root `CLAUDE.md`). These are the relevance targets for distillation. If none is declared, note it under `## HUMAN` and fall back to the repo name as the sole project.

- [ ] **Read the skill.** Before fetching, read the `content-digest` skill and apply its fetch → tag → distil → triage pipeline — prefer a local copy (`.mdblu/skills/content-digest.md` or `.claude/skills/content-digest/SKILL.md`), else fetch on demand with `mdblu skills get content-digest`. A dangling slug is a warning, not a failure.

- [ ] **Authenticate, provider-aware** — reuse emaildeck's auth (the same tokens the `emaildeck_run.js` runner uses):
  - **Gmail** (default): refresh `~/.config/flowdeck/tokens/google.json` if expired; on 401 stop and note to run `flowdeck auth google --force`.
  - **Outlook**: refresh the Microsoft token; on 401 note to run `flowdeck auth microsoft`.
  - Ensure the labels `BOT-READ`, `TO-READ`, `DELETE` exist; create any that are missing.

- [ ] **Fetch unread newsletters.** Gmail query: `is:unread (unsubscribe OR newsletter OR digest) -label:BOT-READ` (Outlook: the equivalent unread + newsletter-category filter). Paginate to exhaustion; fetch the full body of each thread. **Apply `BOT-READ` to each thread as it is read, before processing** — so a partial run never leaves a thread unlabelled.

- [ ] **Distil.** For each thread, score relevance against the active-projects list; write a 3–5 sentence signal summary per relevant item (a thread may map to several projects). Skip pure-transactional noise (receipts, auth codes, order confirmations, calendar invites) and record it in a `## Noise` list.

- [ ] **Write the digest.** Scaffold `.flowdeck/.emaildeck/_digests/<YYYY-MM-DD>.md` (use today's actual date) from `_energy-cards/DIGEST.md.template`. One `### Item` section per relevant thread — source, thread ID, project tags, distillation — plus a per-item triage checkbox block with defaults **pre-selected by signal type**. Report the file path and item count in your text response; do **not** print the digest table itself.

- [ ] **Triage.** Present the digest, then await the operator's per-item selection (or read the selections back from the saved digest's checkboxes). Execute each chosen action before moving to the next — do not batch. Action map:
  - **Keep** → apply `TO-READ`.
  - **Deep** → write `.flowdeck/.emaildeck/_digests/deep/<YYYY-MM-DD>-<slug>.md` with expanded, optionally web-search-enriched analysis; the operator comment is the focus directive.
  - **Delete** → apply `DELETE` (marks for the human to bulk-delete — never permanently delete).
  - **Skill** → **mdblu flow.** Pause for two questions: (1) visibility — public or private? (2) new file, or extend an existing skill? Then:
    - **public** → run mdblu's `/add-skill` skill to draft the skill from the item and open a contribution PR (`mdblu propose`).
    - **private** → write to the host's local skills dir (`.mdblu/skills/<slug>.md`, or `.claude/skills/<slug>/SKILL.md` for Claude auto-apply).
  - **AddCard** → `flowdeck file <deck-path> <slug>` — the sanctioned cross-deck primitive (writes provenance frontmatter; `--column <col>` defaults to `_stock`, `--data '{...}'` passes a brief). Do **not** hand-write `TODO.md` into sibling repos — that caused the market-context-pitch drift.

- [ ] **Commit** any digest artifacts: `git add .flowdeck/.emaildeck/_digests && git diff --cached --quiet || git commit -m "digest: <YYYY-MM-DD>"`.

## HUMAN

- [ ] Review the digest at `.flowdeck/.emaildeck/_digests/<YYYY-MM-DD>.md` and confirm or adjust the pre-selected triage per item (Keep / Deep / Delete / Skill / AddCard).
  > _answer:_
- [ ] For any **Skill** selection, decide visibility (public → mdblu PR / private → local) and new-vs-extend when prompted.
  > _answer:_

#### COMMENTS

<!-- Optional extension actions, trimmed from the default action map (each was used once in the source ritual and adds surface — add back per card as needed):
     • Tweet → draft to `.flowdeck/.emaildeck/_digests/tweets/<YYYY-MM-DD>-<slug>.md` (never posts)
     • ADR   → prefer AddCard → `send-to-crunchdeck` → `to-decision`, which routes into this project's own ADR convention rather than writing a parallel `docs/adr/` path -->
