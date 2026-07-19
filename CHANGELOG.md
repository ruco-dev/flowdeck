# Changelog

All notable changes to the flowdeck deck registry are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [v0.2.0] — 2026-07-19

### Added

- **postdeck** (v0.1.0) — Tenth deck for Instagram carousel posts. Includes post-card scaffolding via `postdeck-new-post` blueprint, HTML template system with schema-constrained char limits (generation constraint, not CSS), and Playwright-based PNG rendering. Playable hard rules: no artifacts, bundled fonts so headless renders match browser, render step is mechanical only.

- **sitedeck** (v0.1.0, local) — Eleventh deck for website pages, posts, and menus. Built on Eleventy with Nunjucks layouts and a hybrid menu system (page frontmatter owns membership/order, `MENU.md` owns statics). Card taxonomy: `pages/`, `posts/` (draft-scoped), `menus/`, `sections/`. Eleventy build wrapper (`scripts/build.js`) handles drafts preprocessing and global data injection; four blueprints and an init ritual scaffold the structure. Local deck only — private consulting leverage. Registered in `LOCAL-DECKS.md`.

- **seodeck routines 2–4: sitemap checklist** (seodeck v0.4.0–v0.8.0) — Three data-driven instruments added to seodeck: (2) `seodeck-sitemap-gsc-diff` compares advertised sitemap URLs against Google's internal-linking view, reporting both orphans (sitemap-only) and gaps (GSC-only, with optional impression filter). (3) `seodeck-sitemap-indexability` checks each URL for indexability verdicts (`non-200`, `blocked-robots`, `noindex-*`, `canonical-elsewhere`, `indexable`), parsing `robots.txt` per-origin and optionally inspecting flagged URLs against GSC coverage data. (4) `seodeck-sitemap-gsc-diff` routine mints a reconciliation pipeline: enumerate, error-check, classify. All three are energy-card templates scaffolded as folder cards by `seodeck-init`; `site_checks` and `seodeck_gsc.js` gain `--out`, `--inspect`, and new subcommands.

- **seodeck-audit-page sleeve refactor** (seodeck v0.5.0) — Replaced the blueprint two-card flow (`flowdeck blueprint use seodeck-audit-page <slug>`, which minted a throwaway top-level card) with a direct sleeve ritual: `flowdeck play seodeck-audit-page --with target=<path>`. The `params:` frontmatter injects the `--with` argument, eliminating dead-weight ephemeral cards. Audit dimensions now include Search Performance (GSC data) and Broken Links (internal + outbound) alongside the four skill dimensions.

- **seodeck GSC integration** (seodeck v0.3.0–v0.4.0) — Shipped `seodeck_gsc.js` (Google Search Console API client) and `seodeck_site_checks.js` (live URL technical checks) as manifest-declared scripts; they were documented in AGENT.md but never installed until `manifest.scripts` was listed. Adds three audit dimensions: Technical, Structured Data, Search Performance. Companion flowdeck-cli fix (v0.19.0) installs deck scripts under the deck's install root (`.flowdeck/.<deck>/_scripts/`) instead of a flat board-level copy.

- **seodeck-inspect-urls** (seodeck v0.6.0) — Google Indexing API alternative: a new `inspect-urls/` instrument folder card runs the read-only URL Inspection API on each URL, triaging results — defects become HUMAN *resolve* tasks; clean URLs become HUMAN *request-index* tasks with one-click GSC links. Rationale in new seodeck `ADR-0001-inspect-not-reindex.md`. Documented in deck README + `ACTIONS.md`.

- **Fix: minted card missing `_answer:_` stub** — `publish-readiness-audit` and `deal --upgrade` now mint HUMAN decision items with the required `> _answer:_` stub that `flowdeck kemps` uses for detection. Fixed the template skeleton in crunchdeck's publish-readiness-audit ritual and updated the flowdeck-cli deal prompt (v0.19.0).

### Changed

- **meld-mechanics** — `CARD-SENDING.md` gains a canonical § Meld mechanics: the doc fold (CHANGELOG `## [Unreleased]` slice always; README only on user-facing change) happens in the meld commit itself, not at release; local-origin melds commit directly on the default branch while foreign-origin (v2) melds fold via PR — meld is the review moment for someone else's claimed work; releases promote + verify via a three-way reconciliation (commits since last tag ↔ meld cards ↔ Unreleased entries), never re-derive notes from the pile. The reconciliation is wired into crunchdeck's `publish-readiness-audit` § Docs drift (crunchdeck v0.11.0) and the CLI's default `release` sleeve card.

- **underscore-reserved-for-piles** — Reversed the `_`-prefix rule from ADR-0005: `_` is now reserved exclusively for unplayable pile folders (`_stock`, `_meld`, `_sleeve`, `_blueprints`, etc.); instrument folders with a playable root `TODO.md` revert to plain names. 21 reversals across 8 deck manifests; each manifest's `renameRegistry` carries the reverse direction so `flowdeck update <deck>` migrates live instances. CLI 0.18.0 enforces the pile-naming rule as a structural error.

### From [Unreleased] before v0.2.0

- **creamdeck billing chain** (creamdeck v0.6.0 → **v0.7.0**) — A proposal → request note → invoice document chain on top of the ticket pipeline. New `creamdeck-new-proposal` blueprint mints proposals from `PROPOSAL.md.template`; approving one runs `approve-proposal.js` to stamp a per-item hash that a ticket's `Billing Ref` field can point to; `export-invoice.js` renders a provider-agnostic `invoice-export.json` for a future financial-app connector. Adds `REQUEST-NOTE.md.template` and `INVOICE.md.template` energy cards; decision recorded in creamdeck `ADR-0001-billing-documents.md`.

- **emaildeck message-scoped inbox + outbound draft lifecycle** (emaildeck v0.9.2 → **v0.10.0**) — Inbox cards are now one-per-**message** rather than per-thread (a reply can be its own topic); the **Message ID** is the dedup key while the thread ID becomes a correlation floor, so messages already captured under the old thread-scoped scheme aren't recreated. Outbound mail flows through an explicit pipeline — `local_drafts/` (composed locally) → `pushed_drafts/` (Gmail draft created by `push-to-gmail`, awaiting send) → `sent/` (filed by `check-sent` on Gmail-confirmed send) — with `pushed_drafts/`/`sent/` as destination piles. `emaildeck-compose` composes a new message straight into `local_drafts/`; `emaildeck_run.js` reworked for message-scoping.

- **decks-lint: `tracking[]` manifest field + `_scripts/` crossref shape** — New optional `tracking[]` manifest array declares extra deck-root files that are neither `energyCards` nor `scripts` (e.g. standing policy/reference docs); the linter validates it as an array, checks each listed file exists, and treats tracked files as known top-level entries. Blueprint cross-ref checking also now accepts the deck-local `_scripts/<script>` reference shape (installRoot decks), and `README.md` is orphan-exempt. Documented in the `DECKS.md` manifest format.

## [v0.1.0] — 2026-07-11

### Added

- **emaildeck `summarize-inbox`** — `SUMMARY.md.template` energy card + `summarize-inbox` action that mints a dated `_digests/<YYYY-MM-DD>-summary/` folder card from already-fetched mail-inbox cards. Groups threads into themes (synthesis + project-relevance + linked card list), a noise list, and a HUMAN triage section. Every card appears exactly once, linked back to its source; summaries chain via a previous-summary link. Distinct from `emaildeck-digest` (digest fetches; this synthesises). Wired into `mail-inbox/`'s `## ACTIONS` and documented in the scaffolded `ACTIONS.md`.

- **emaildeck v0.9.0** — ADR-0006 pioneer for the underscore-reserved-for-piles rule: `renameRegistry` flips 4 structural folders (`filters/`, `mail-inbox/`, `mail-archive/`, `drafts/`) back to plain names (playable cards); `_digests/`/`_scripts/`/`_sleeve/` remain piles. New `emaildeck-setup` sleeve ritual owns first-run filter establishment (auth preflight, context-detected filter scaffold, human interview, initial backfill fetch); `emaildeck-init` reverts to structure-only; `mail-inbox/` becomes a pure daily recurring inboxing card (`recurrence: daily`, cron-able via `flowdeck play mail-inbox`). Runner gains `_`-prefixed fallback for not-yet-migrated instances; a post-delivery regex fix prevents an empty `FILTER.md` section from poisoning all Gmail queries to 0 threads.

- **underscore-reserved-for-piles** — Reversed the `_`-prefix rule: `_` is now reserved exclusively for unplayable pile folders (`_stock`, `_meld`, `_sleeve`, `_blueprints`, etc.); instrument folders with a playable root `TODO.md` revert to plain names. 21 reversals across 8 deck manifests; each manifest's `renameRegistry` carries the reverse direction so `flowdeck update <deck>` migrates live instances. CLI 0.18.0 enforces the pile-naming rule.

- **card-sending** — Formats, docs, and release gate for structured card exchange between decks, projects, and bots. `CARD-SENDING.md` is the canonical reference: envelope frontmatter table, INBOX.md + SENT.md format blocks, the board-level-only placement decision, the quarantine invariant, and the release gate. The gate is wired into crunchdeck's `publish-readiness-audit` — `flowdeck inbox --gate` must hold no unmelded received cards before a READY verdict.

- **publish-readiness-audit** (crunchdeck v0.8.0) — Pre-flight sleeve ritual before any release. Verifies artifacts across 7 sections: registry identity, tarball truth, git hygiene, docs drift, deck state, platform/CI, and build smoke. Mints a `prepare-to-publish` folder card with findings split into BOT (mechanical fixes) and HUMAN (decisions), each task citing its audit section. READY hands off to the `_launches/` pipeline.

- **flash-suggest-nick** — `flashCommand` prompt template now has the agent write its recommended nick directly into the card's frontmatter `nick:` field (not just the trailing `<!-- next: -->` marker), so the nick takes effect on the next `flowdeck play` run.

- **play-respect-next-annotation** — `flowdeck play` promotes a pending `<!-- next: <nick> -->` annotation into the card's standing frontmatter `nick:` field before resolving the player, so the promoted nick takes effect for that same run. Unknown nicks warn to stderr and no-op; frontmatter-less cards are left untouched.

- **Per-deck `_sleeve/` + CLI rename migrations** (ADR-0005) — All 9 deck manifests now declare `installRoot: ".<deck>"` and a `renameRegistry`. flowdeck-cli 0.17.0 installs `manifest.sleeveCards` into the deck's own `_sleeve/`, executes the rename registry on `flowdeck update <deck>`, and replaces the byte-equality sleeve divergence guard with a normalized content-hash stamp (`.installed-hash`) so pristine cards receive upstream updates while tuned cards are skipped.

- **`flowdeck list --all-decks`** — New flag on `listCommand` scoping the listing across every deck dir (parent `.flowdeck`, root-level alt decks, nested sub-decks). Output is prefixed `<deck>/<slug>` to disambiguate cards from different decks. Composes with existing pile flags. Default `flowdeck list` output unchanged.

- **sleeve-on-cards** — Closed root `.flowdeck/` sleeve-migration debt: deleted stale pre-sleeve blueprint copies; documented `_sleeve/` as a pile in root `AGENT.md`; updated the `new-deck` blueprint so every newly scaffolded deck ships its init card as a `sleeveCards` ritual, matching all 9 existing decks.

- **Deck naming rule: `_` reserved for piles** — `rename-default-columns` prefixed every deck-scaffolded structural folder with `_` (~29 folders across 9 decks), making init-created containers distinct from per-record content folders. Migration via `flowdeck update <deck>` using each manifest's `renameRegistry`.

- **emaildeck-digest** (emaildeck v0.7.0) — `emaildeck-digest` blueprint (`lifecycle: recurring`, `recurrence: on-demand`, `skills: content-digest`). Provider-aware fetch reusing emaildeck's Gmail/Outlook auth → distil against the host's active-projects list → write a dated `digests/<YYYY-MM-DD>.md` from a new `DIGEST.md.template` energy card. First `decks/*/blueprints/` card to carry YAML frontmatter; `decks-lint` Check 5 updated to read frontmatter `lifecycle:` with HTML-comment fallback.

- **`skills:` frontmatter convention** — New card-frontmatter key hooking flowdeck's lifecycle (deal/stock tags, play applies, meld harvests) to the mdblu skills library. `AGENT.md` gained a `## Skills` section; `TODO.md.template` and `new-deck` blueprint carry a matching hint. Harvest is advisory in v1 (not meld-blocking).

- **sleeve rollout to 7 remaining decks** — Applied the emaildeck sleeve recipe to calendardeck, crunchdeck, farmdeck, webdeck, gitdeck, creamdeck, and notedeck: every `*-init` blueprint moved to `sleeve-cards/` as a ritual; folder-scoped instruments folded into each init's scaffold as folder cards (`lifecycle: recurring`). All 7 manifests bumped; `decks-lint` 0 findings across 8 decks.

- **`create-project-audit-blueprints`** — Added `project-audit` and `apply-project-audit` to `.flowdeck/_blueprints/`. `project-audit` fills a root `AUDIT.md` across five categories with S/M/L scoring. `apply-project-audit` implements `[BOT]`-tagged recommendations directly and surfaces `[HUMAN]`-tagged ones as checklist items — standalone by design.

- **emaildeck sleeve pioneer** (emaildeck v0.6.0) — Converted emaildeck to the sleeve architecture, setting the pattern for all other decks. Folder-scoped instrument blueprints deleted; bodies folded into `emaildeck-init` as folder cards. `emaildeck-init` moved to `sleeve-cards/` as a ritual with conditional commit so replay = `install --repair`. `decks-lint` extended for `sleeveCards` and `ritual` lifecycle.

- **emaildeck Gmail runner** (emaildeck v0.4.0) — Deterministic Gmail filter runner (`scripts/emaildeck_run.js`) with OAuth refresh, query, labeling, EMAIL.md/TODO.md scaffolding, thread-ID dedupe, and `after:` derived from the Run Log. Fixed the run-log double-append bug. New one-shot `emaildeck-backfill-bodies` blueprint repairs empty-body cards.

- **Unified standing cards** — Converged all deck standing cards onto one mechanism: a manifest-declared blueprint with `<!-- lifecycle: X -->`, scaffolded copy-if-missing by `*-init`. Created 9 blueprints across calendardeck, crunchdeck, and emaildeck. Documented four lifecycle values (`idempotent / one-shot / recurring / standing`) in `DECKS.md`.

- **creamdeck report pipeline** (creamdeck v0.3.0) — Canonical `scripts/report.js` (tickets → `REPORT.md` with hours subtotals) and `scripts/html.js` (tickets → static `report/` site, `--lang <code>` translated copies). `PIPELINE.md.template` gains `Awaiting Quote`/`Blocked` statuses.

- **crunchdeck stats dashboard** — `STATS.md.template` energy card (npm + GitHub sources, with an `<!-- add sources -->` extension point) and a `crunchdeck-stats` standing card; wired into `crunchdeck-init`.

- **farmdeck intake documentation** (farmdeck v0.1.2) — Documented three intake patterns: suppression-list deduplication via CONTACTED.md, `_TODROP/` batch-operations for bulk card processing, and hash-suffixed slugs for collision-safe programmatic naming. Added "Deck-Design Principle" to DECKS.md: deterministic scripts scaffold cards; the model only enriches.

- **calendardeck QoL bundle** (calendardeck v0.3.0) — Day-scoped `sync-day` re-fetch with idempotent (event-id-keyed) meeting-notes injection into a new `NOTES.md` energy card; a token → MCP Google Calendar → public ICS three-tier sync fallback; a flat `events/<YYYY-MM-DD>-<slug>/EVENT.md` quick-event convention; fixed day-slug zero-padding bug.

- **`decks-lint`** — Mechanical integrity linter for all `decks/*/` sources: manifest completeness, both-direction manifest↔filesystem reconciliation, AGENT-section heading structure, energy-card no-frontmatter rule, blueprint lifecycle markers, blueprint cross-refs, and DECKS.md registry agreement. Runs in CI on push + PR.
