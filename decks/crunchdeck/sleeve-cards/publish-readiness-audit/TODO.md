---
lifecycle: ritual
recurrence: on-demand
nick: Shark

---

# publish-readiness-audit

> **Sleeve resident.** Ritual card: it lives in the deck's own `_sleeve/` (`.flowdeck/.crunchdeck/_sleeve/`), is played in place, and is never melded. Play it before running the `launches/` pipeline, or whenever "is this repo ready to go public?" needs a grounded answer.
>
> The audit is **read-only against the repo** — it fixes nothing in place; findings materialize as a `prepare-to-publish` folder card (`AUDIT.md` report + `TODO.md` fix tasks) in `.flowdeck/.crunchdeck/` (or are applied directly via ACTIONS below). Its core discipline: **verify artifacts, not claims.** Checked boxes, `files` arrays, gitignore rules, and READMEs are all claims — the registry, the tarball listing, `git ls-files`, and the entry-point source are evidence. Every step below traces to a real failure found in a live multi-repo audit.

## BOT

---

### 0 · Scope

- [ ] Establish what "publish" means here: npm package (`package.json` with `name`/`bin`), git-only public repo, or both. Read `package.json`, `../profile/PROFILE.md`, and `FLOWDECK.md` for product context. Record the scope as a note on this item before proceeding.

---

### 1 · Identity

- [ ] Package name: does it match the org's naming policy (scoped vs unscoped)? Query the registry for BOTH namespaces — `npm view <name>` and `npm view @<org>/<name>`. Twin packages with diverging versions are a live failure mode: record which is canonical and whether the other needs `npm deprecate`.
- [ ] Version: local `package.json` vs published. Local ahead = unshipped work (fine — but the CHANGELOG must cover it); local behind = someone published from elsewhere (investigate).
- [ ] Dependencies: every `import`/`require` in source resolves to a declared dependency of the SAME name (importing `x` while depending on `@org/x` breaks clean installs even when a stale lockfile or bundler masks it locally); no runtime deps hiding in `devDependencies`.

### 2 · Tarball truth (npm scope only)

- [ ] Run `npm pack --dry-run` and READ the file list — never trust the `files` array, `.npmignore`, or gitignore assumptions:
  - Everything the README promises ships: content dirs the CLI reads at runtime (templates, skills, assets), `dist/`, binaries. A missing content dir ships a broken CLI that no local test catches.
  - Nothing internal leaks: `.flowdeck/`, `.claude/`, work logs, digests, `.env`, `*.tgz`.

### 3 · Git hygiene

- [ ] `git status --short` — clean tree, or every dirty path explained on this card.
- [ ] Unpushed commits: `git log origin/<default>..HEAD --oneline | wc -l`. A public repo N commits behind local is not published, whatever the local state says.
- [ ] Private-content sweep over `git ls-files` output (tracked files are what publishes): client names or data, real email addresses beyond public author contacts, mail thread IDs, API keys/tokens, `.env`, absolute `/Users/<name>` or `/home/<name>` paths. Decide per hit: sanitize, untrack, or accept deliberately (record the acceptance).
- [ ] Tracked-vs-ignored contradictions: `git ls-files | git check-ignore --stdin --no-index -v` (any output = a file tracked despite an ignore rule — it was added before the rule and WILL publish). Fix with `git rm -r --cached <path>`.
- [ ] The inverse: is anything gitignored that a contributor's clean clone needs to run the project (source dirs, `package.json`, `bin/`)? If intentional, record the consequence (CI and clone-and-run break) as an accepted trade-off; otherwise fix.

### 4 · Docs drift

- [ ] Verify the README against the CODE, not against memory: every documented command / flag / env var exists in the actual entry point(s); every tool or command the code exposes is documented. Read the entry files and compare — docs describing a previous iteration of the product is how trust dies.
- [ ] CHANGELOG top entry vs `package.json` version — an unreleased vNext entry sitting above the shipped version confuses consumers; align them or mark the entry Unreleased.
- [ ] Meld↔notes reconciliation: commits since the last tag ↔ meld cards covering them (`commits:` envelope field where present) ↔ `CHANGELOG` `## [Unreleased]` entries. An uncovered commit is undocumented work (mint + meld a pre-checked card); a meld with no Unreleased line is a skipped fold — **BLOCKER**, same class as an unmelded inbox resident (repo-root `CARD-SENDING.md § Meld mechanics`).
- [ ] LICENSE file exists at repo root and matches `package.json` `license`; if the repo carries dual licensing (code vs content), both are stated.

### 5 · Deck state

- [ ] Scan this repo's `.flowdeck/` for open cards that contradict publishing: rename/reframe campaigns, satellites of dead campaigns, half-done publish prep. A `prepare-to-publish/` card left from a previous run counts — unchecked blocker tasks on it carry into this run's verdict (re-verify each; don't re-derive from scratch).
- [ ] False-completion check: for any card CLAIMING publish prep is done (rename, deprecation, tombstone), verify the artifact itself — on disk, in the registry, on the remote. A checked box is a claim, not evidence.
- [ ] Card-sending inbox gate: the board-level `_inbox/` must hold no unmelded received cards. A `done-report` describes work that already landed and therefore belongs in *this* release's notes/docs (see repo-root `CARD-SENDING.md § Release gate`). **v1 check:** `flowdeck inbox --gate` (exits non-zero while residents exist); degrade to a manual "is `.flowdeck/_inbox/` empty?" check if the CLI helper is absent. **v2** adds a mandatory remote verify — an empty local folder proves nothing, so hard-fail if the exchange repo is unreachable. Any resident is a **BLOCKER**: meld it (folding its slice into the release notes) before READY.

### 6 · Platform & CI

- [ ] `gh repo view <org>/<repo>`: exists, visibility matches intent, and the local `origin` remote plus `package.json` `repository` field point at the canonical org (split-org drift creeps in silently).
- [ ] CI workflows: would they pass on a FRESH clone? Two traps: workflows that need gitignored files, and path filters that don't watch newly added content dirs (a stale-manifest check that ignores the new folder passes while the manifest rots).

### 7 · Build smoke

- [ ] Run the repo's build / lint / test commands. Record pass/fail with the actual error output — "should pass" is not a result.

---

### 8 · Verdict → prepare-to-publish card

- [ ] Decide the verdict: **READY / NOT READY**. READY means zero blockers; warnings alone do not block. Follow the read-only rule — the ritual records fixes on the card below, it does not apply them (unless an ACTION is activated).
- [ ] Mint (or refresh) the folder card `.flowdeck/.crunchdeck/prepare-to-publish/` — crunchdeck folder-card pattern: companion document + `TODO.md`. If it already exists from a previous run, update in place; never clobber checked boxes or `## HUMAN` answers.
- [ ] Write `AUDIT.md` — the full report, newest run on top (prior runs stay below as history): date, scope (from step 0), verdict, then per-section findings with the actual evidence (command output excerpts, file:line), **BLOCKERS** (each with the concrete fix), **WARNINGS**, and accepted trade-offs.
- [ ] Write/reconcile `TODO.md` — every task cites its `AUDIT.md` finding (`AUDIT.md § <section>`). Split by the judgment line: mechanical and unambiguous → `## BOT`; needs a decision, credentials, or an external account → `## HUMAN`. Warning-derived tasks get a `warning:` prefix. On a refresh: add tasks for new findings; mark tasks whose finding no longer reproduces `[x]` with a `verified <date>` note. Skeleton:
  ```markdown
  ---
  lifecycle: one-shot
  ---

  # prepare-to-publish

  > Minted by the `publish-readiness-audit` sleeve ritual. Findings and evidence live in `AUDIT.md`; every task below cites its finding. Replaying the ritual refreshes AUDIT.md and reconciles this card.

  ## BOT

  - [ ] <concrete mechanical fix — e.g. files-array addition, `git rm --cached <path>`, CI path filter> (AUDIT.md § <section>)

  ## HUMAN

  - [ ] <decision — e.g. sanitize vs accept a private-content hit, canonical twin + `npm deprecate`, license choice> (AUDIT.md § <section>)
    > _answer:_

  #### COMMENTS
  ```
- [ ] If READY: note it on `.flowdeck/.crunchdeck/launches/TODO.md` — the launches pipeline runs the actual ship. If NOT READY: play `prepare-to-publish` to burn the tasks down, then replay this ritual to re-verify.
- [ ] Append a run record to `#### COMMENTS`: date, verdict, blocker/warning counts, pointer to `prepare-to-publish/AUDIT.md`. Reset the `## BOT` checkboxes for the next run (ritual semantics).

## HUMAN

## ACTIONS

<!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

- [ ] fix-mechanical — apply the one-line blockers directly (files array additions, `git rm --cached`, CI path filters) instead of writing them as `## BOT` tasks on `prepare-to-publish`; still record each in `AUDIT.md`
- [ ] deprecate-twin — run `npm deprecate` on the non-canonical twin package with a pointer to the canonical name
- [ ] deep-secret-scan — run a dedicated secret scanner (e.g. `gitleaks detect`) over the full git history, not just the working tree

#### COMMENTS
