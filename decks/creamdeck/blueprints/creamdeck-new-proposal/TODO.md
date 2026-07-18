---
lifecycle: one-shot
---

# creamdeck-new-proposal
<!-- lifecycle: one-shot -->

## BOT

- [ ] Check `.flowdeck/.creamdeck/` exists. If not, stop and surface under `## HUMAN` to run `creamdeck-init` first.

- [ ] Check `.flowdeck/.creamdeck/proposals/` exists. If not, create it and create `proposals/TODO.md` as the proposals overview card:

  ```markdown
  # proposals

  ## BOT

  - [ ] List all subdirectories in this folder. For each, read `PROPOSAL.md` — extract title, ID, status, contact, and total value (sum of the Items table's Total column).
  - [ ] Surface proposals under `## HUMAN`, grouped by status (Draft, Sent, Approved, Rejected, Expired).

  ## HUMAN

  ## ACTIONS

  <!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

  - [ ] new-proposal — scaffold a new proposal card from `_energy-cards/PROPOSAL.md.template`; ask for title, linked contact slug, currency, valid-until date, and a line-item list (`description | qty | unit price` per line). Auto-generate the proposal ID: read `Prefix` from the `## Document IDs` table in `CREAMDECK.md`, count existing proposal subdirs for the sequence (zero-padded to 3 digits), and combine as `{PREFIX}P{DDMMYYYY}{SEQ}` using today's date (e.g. `XYZP29062026001`). Compute each item's Total as qty × unit price; leave every Hash cell `—`.
  - [ ] mark-approved — prompt for a proposal ID or folder name; run `node .flowdeck/.creamdeck/_scripts/approve-proposal.js <id-or-folder>` from the project root to mint item hashes and set Status to Approved

  #### COMMENTS
  ```

- [ ] Read `## HUMAN` below for title, linked contact, currency, valid-until, and items. Stop and surface any missing required values (title, at least one item) under `## HUMAN`.

- [ ] Generate a proposal ID: read `Prefix` from the `## Document IDs` table in `CREAMDECK.md`. Count existing subdirectories in `proposals/` (excluding non-proposal files) + 1, zero-padded to 3 digits. Combine as `{PREFIX}P{DDMMYYYY}{SEQ}` using today's date (e.g. `XYZP29062026001`).

- [ ] Generate slug from title: kebab-case, max 40 characters.

- [ ] Create `.flowdeck/.creamdeck/proposals/{{DATE}}-{{SLUG}}/`.

- [ ] Parse the `## HUMAN` item lines (`description | qty | unit price`); compute each row's Total as qty × unit price. Build the `## Items` table with one row per item, numbered from 1, Hash cell `—` for every row (hashes are minted only on approval — see `mark-approved`).

- [ ] Scaffold `PROPOSAL.md` from `_energy-cards/PROPOSAL.md.template` — substitute `{{PROPOSAL_TITLE}}`, `{{PROPOSAL_ID}}`, `{{CONTACT}}`, `{{STATUS}}` (default: Draft), `{{DATE}}` (today), `{{VALID_UNTIL}}`, `{{CURRENCY}}` (default: EUR), and replace the single templated example item row with the full computed `## Items` table.

- [ ] Create `TODO.md` in `.flowdeck/.creamdeck/proposals/{{DATE}}-{{SLUG}}/`:

  ```markdown
  # {{PROPOSAL_TITLE}}

  ## BOT

  - [ ] Read `PROPOSAL.md` — extract title, status, contact, valid-until, and item count.
  - [ ] Surface a proposal summary under `## HUMAN`; flag if Status is Sent and Valid Until has passed.

  ## HUMAN

  ## ACTIONS

  <!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

  - [ ] send — set Status to Sent in `PROPOSAL.md`
  - [ ] mark-approved — run `node .flowdeck/.creamdeck/_scripts/approve-proposal.js {{PROPOSAL_ID}}` from the project root to mint item hashes and set Status to Approved
  - [ ] mark-rejected — set Status to Rejected in `PROPOSAL.md`
  - [ ] generate-request-note — create a request note from this proposal's approved items (see creamdeck AGENT.md "Billing lifecycle")
  - [ ] log-update — append an entry to the Updates section of `PROPOSAL.md` (date + summary)

  #### COMMENTS
  ```

- [ ] Commit: `git add .flowdeck/.creamdeck/proposals && git commit -m "deck: new proposal — {{PROPOSAL_TITLE}}"`.

## HUMAN

- [ ] Title:
  > _answer:_

- [ ] Linked contact slug (from `_contacts/`):
  > _answer:_ (optional)

- [ ] Currency (e.g. EUR, USD):
  > _answer:_ (default: EUR)

- [ ] Valid until (`YYYY-MM-DD`):
  > _answer:_ (optional)

- [ ] Items — one per line, format `description | qty | unit price`:
  > _answer:_

#### COMMENTS
