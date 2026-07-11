# creamdeck

The `.flowdeck/.creamdeck/` directory is a minimal, project-scoped CRM deck. It tracks contacts and incoming communications (emails, calls) relevant to this project.

**Standing cards (created by `creamdeck-init`):**
- `.flowdeck/.creamdeck/creamdeck-inbox/` — `TODO.md` — all incoming items (emails routed from emaildeck, logged calls); each item is a subfolder with `INBOX-ITEM.md` + `TODO.md`

**Per-instance cards:**
- `.flowdeck/.creamdeck/_contacts/<slug>/` — `CONTACT.md` + `TODO.md` — one per tracked contact; created from an inbox item or directly via `creamdeck-add-contact`
- `.flowdeck/.creamdeck/tickets/<YYYY-MM-DD>-<slug>/` — `TICKET.md` + `TODO.md` — one per ticket; opened via `creamdeck-open-ticket` or the `open-ticket` action in `tickets/TODO.md`

**Inbox item lifecycle:**
1. Item arrives (emaildeck routes a thread, or you log a call via `create-inbox-item`)
2. Inbox management card is played — bot surfaces unrouted items
3. Per-item `TODO.md` is played — bot summarises and activates ACTIONS
4. Human picks an action: `create-contact`, `log-to-contact`, `draft-reply`, `route-to-crunchdeck`, `schedule-follow-up`, or `archive`

**Ticket lifecycle:**
1. Ticket is opened via `creamdeck-open-ticket` — stage defaults to New
2. Ticket card is played — bot surfaces summary and flags stale Waiting tickets
3. Human advances stage, logs updates, drafts replies, or closes the ticket
4. Stage sequence: New → Open → Awaiting Quote → Waiting → Blocked → Resolved → Closed (a ticket may skip stages or move back; the pipeline is a guide, not a gate)

**emaildeck integration:** configure an emaildeck filter with `send-to-creamdeck` in its default tasks to route matched threads automatically into `.creamdeck/creamdeck-inbox/`.

**crunchdeck integration:** any inbox item can be forwarded to `.crunchdeck/crunchdeck-inbox/` via the `route-to-crunchdeck` action, turning a contact signal into a product signal.

**calendardeck integration (`add-meeting`):** if `.flowdeck/.calendardeck/` is not installed, surface a `## HUMAN` note to run `calendardeck-init` first and skip. Otherwise, when `add-meeting` is played on a ticket:
1. Ask for the meeting date (`YYYY-MM-DD`) and an optional follow-up date if not already provided under `## HUMAN`.
2. Generate a slug from the ticket title (kebab-case, max 40 characters).
3. Scaffold `.flowdeck/.calendardeck/_events/<date>-<slug>/EVENT.md` from calendardeck's `_energy-cards/EVENT.md.template` (calendardeck owns this path and shape — see its AGENT.md "Quick Events" and ADR-0003), populating `Ticket` (this ticket's ID), `Contact` (the ticket's linked contact), `Date`, `Follow-up`, and `Status` (default: Scheduled) from the ticket's own fields.
4. Write the resulting path back into `TICKET.md` under a new `| Meeting |` row (add it if missing), and append a line to the Updates section: `**{{DATE}}** · Meeting scheduled — see calendardeck event`.
5. creamdeck never reads back from calendardeck after this — it is a one-time write, not an ongoing sync. Rescheduling means editing `EVENT.md` directly.

**Blueprints (mortal templates — each play mints a new meldable card):**
- `creamdeck-add-contact` — create a new contact card directly (without going through inbox)
- `creamdeck-open-ticket` — open a new ticket card

**Sleeve residents & `sleeveCards`:**

The manifest's `sleeveCards` field lists exactly one card: `creamdeck-init`. It is a **ritual** (`lifecycle: ritual`, `recurrence: on-demand`): `flowdeck install creamdeck` copies it into the deck's own `_sleeve/` (`.flowdeck/.creamdeck/_sleeve/`) and plays it in place; replaying it is `flowdeck install creamdeck --repair` (every step create-if-missing). It is never melded.

`sleeveCards` holds no operational instruments beyond init — every creamdeck standing card (`creamdeck-inbox/`, `_contacts/<slug>/`, `tickets/`) is scaffolded by the init ritual inline rather than shipped as a separate blueprint or sleeve resident, and none of them acts on a folder distinct enough to warrant a standalone folder card. the board's root `_sleeve/` is reserved for project-generic / cross-cutting instruments; a deck's own `_sleeve/` holds its rituals (e.g. the default `release` card); creamdeck adds none. A deck whose init is its only sleeve resident is the common case, per emaildeck's own AGENT.md note.

The init ritual also installs `report.js` and `html.js` into `.flowdeck/.creamdeck/_scripts/` via the same `manifest.scripts` / `_scripts/` prefix convention emaildeck uses — see "Reports & exports" below for the runtime paths.

## Reports & exports

`creamdeck-init` installs two scripts into `.flowdeck/.creamdeck/_scripts/`. Run them from the project root via the `tickets/TODO.md` ACTIONS (never as bare `node …` commands in user-facing docs):

- `_scripts/report.js` — rebuilds `tickets/REPORT.md` (hours subtotals per stage + grand total). Action: `generate-report`.
- `_scripts/html.js` — renders a static HTML site under `_report/`. Action: `export-report`.
- `_scripts/html.js --lang <code>` — renders a localized copy under `_report/<code>/`. Action: `export-report --lang <code>`.

**Translation flow** (`export-report --lang`): the agent reads each `TICKET.md`, translates `title` / `description` / `updates` / `resolution` into the target language, writes them to `_report/<code>/.translations.json` (keyed by ticket ID), then re-runs `_scripts/html.js --lang <code>`. The script renders from that manifest, falling back to the original text for any missing ticket or field.

## Client data & deploy config

- **`_report/` output is client data.** The generated `_report/` tree (and any `.translations.json`) belongs to the installed project — it is git-committable there, but must **never** be promoted back into the deck template. When editing the `creamdeck` deck source, keep it free of any generated report or ticket content.
- **Deploy configuration lives outside the repo.** SFTP/host credentials or publish settings for the `_report/` site must not be committed anywhere in the project — keep them in the environment or an untracked local config. (Prompted by a prior plaintext-SFTP-credential incident.)
