---
lifecycle: ritual
recurrence: on-demand
nick: Shark

---

# publish-vuln-audit

> **Sleeve resident.** Ritual card: it lives in the deck's own `_sleeve/` (`.flowdeck/.crunchdeck/_sleeve/`), is played in place, and is never melded. Play it before `publish-readiness-audit` (which gates on its freshness), or whenever "are we shipping known-vulnerable dependencies?" needs a grounded answer.
>
> **Sibling ritual.** `publish-readiness-audit` asks *is this repo fit to be published* (identity, tarball, docs, git hygiene). This one asks *is what we're publishing, and what it pulls in, free of known vulnerabilities* — and, within a narrow safe band, fixes it. The two mint different folder cards and do not overwrite each other.
>
> **Fix policy — three tiers, and the boundary is the whole point.** This ritual ships to arbitrary consumer projects, so a wrong fix is not ours to absorb:
>
> | Tier | Scope | Rule |
> |---|---|---|
> | **1 · Always** | `npm audit` (and equivalents) read-only | Run it, record every finding on the folder card. Never skipped. |
> | **2 · May** | `npm audit fix` — **never** `--force` | Only when the fix is **lockfile-only** and stays **inside existing semver ranges**, and only if the host project declares a test command. Run the tests after; revert the lockfile if they fail. |
> | **3 · Hard-stop → human** | anything else | `--force`, a major bump, a dep with no fix available, or any change to a **direct** dependency's declared range. Write it under `## HUMAN` on the findings card with the concrete command; do not run it. |
>
> **Invariant: the ritual never edits `package.json`.** Lockfile only. If a fix requires a manifest edit, that is by definition tier 3.

## BOT

---

### 0 · Scope

- [ ] Establish what is being audited before auditing anything. Read `package.json` (root), and check for `package-lock.json` / `npm-shrinkwrap.json` / `yarn.lock` / `pnpm-lock.yaml`, and a `workspaces` field. Record on this item:
  - **package manager** (from the lockfile present — do not assume npm),
  - **publish surface**: is this an npm package (`name` + not `"private": true`), a git-only repo, or neither,
  - **workspaces**: yes/no (audit must run at the workspace root; per-package audits miss hoisted transitive deps),
  - **test command**: the `scripts.test` value, or `none` (this decides whether tier 2 is available at all).
- [ ] **Degrade cleanly, do not fail.** If there is no `package.json`, this project is not an npm consumer: record verdict **N/A**, write a one-line `VULN-AUDIT.md` stating so with the date, skip to step 5, and do not mint fix tasks. (The flowdeck deck-source repo itself is exactly this case.) Same for a `package.json` with no dependencies at all.
- [ ] If the lockfile is **absent** while dependencies exist, stop the audit path: `npm audit` needs a lockfile and `npm audit --package-lock-only` will silently resolve to *latest matching*, not to what actually ships. Record this as a **BLOCKER** finding ("no lockfile — audit result is not reproducible; run `npm install` to generate one and replay") and continue to step 5.

---

### 1 · Declared-tree audit

- [ ] Run the read-only audit and capture the **JSON**, not the human table — the table rounds away the metadata the later steps need:
  - npm: `npm audit --json`
  - pnpm: `pnpm audit --json` · yarn: `yarn npm audit --json` (Berry) / `yarn audit --json` (v1)
  Non-zero exit is the normal signal that findings exist — do not treat it as a failed command. Record the totals per severity (`critical` / `high` / `moderate` / `low` / `info`).
- [ ] For each advisory, extract and record: advisory title + GHSA/CVE id, severity, the vulnerable **package**, the **path** (which direct dependency pulls it in), whether it is `dev`-only, and `fixAvailable` — noting specifically whether `fixAvailable` is `true` (in-range) or an object with `isSemVerMajor: true` (tier 3).
- [ ] **Dev-only findings are not the same class as runtime ones.** A vulnerability reachable only from `devDependencies` does not ship to consumers of the package — record it, mark it `dev`, and rank it below every runtime finding. It is still a real risk to *this* machine and CI; it is not a publish blocker.
- [ ] `npm outdated` (or the manager's equivalent) for context only — deps several majors behind are where the next advisory lands. This is a **warning** section, never a blocker.

### 2 · Published-artifact audit (npm scope only)

- [ ] The declared tree is what *we* install; the tarball is what *consumers* install. Verify the shipped artifact separately — a `bundledDependencies` entry or a vendored `dist/` can carry a vulnerable copy that `npm audit` over the working tree never sees:
  - `npm pack --dry-run` and read the file list for vendored/bundled dependency trees (`node_modules/` inside the tarball, checked-in `vendor/`, bundled browser builds).
  - If the package is already published, audit what is live: `npm view <name> versions` for the current version, then install it into a scratch dir (`mktemp -d`) and run `npm audit --json` there. This is the number a consumer sees and is the only one that reflects *transitive* drift since the last publish.
- [ ] Cross-check `dependencies` for anything the code no longer imports (a dead runtime dep is pure attack surface with zero benefit) — grep the entry points for each declared runtime dep. Record removals as `## HUMAN` (removing a dep is a `package.json` edit: tier 3).

### 3 · Supply-chain signals

- [ ] Beyond CVEs, record any of these on the findings card as **warnings** — they are how the next incident starts, and none appear in `npm audit`:
  - A direct dependency **unpublished, deprecated, or transferred** (`npm view <name> deprecated`, last-publish date years stale, maintainer change).
  - `install`/`postinstall` scripts in dependencies added since the last audit run (`npm ls --json` diff against the previous run recorded on the card).
  - Lockfile entries resolving to a **non-registry source** (git URLs, tarball URLs, `file:` outside the workspace) — these bypass registry integrity entirely.
- [ ] If the host project has a dedicated scanner configured (Dependabot alerts via `gh api`, Snyk, `osv-scanner`), read its current findings too and reconcile: an alert open there but absent here means the audit scope is wrong. Skip silently if none is configured — do not install a scanner.

---

### 4 · Bounded auto-fix (tier 2 — conditional)

> Execute this section **only if all three hold**: a test command exists (step 0), at least one finding has an in-range `fixAvailable`, and the working tree is clean (`git status --short` empty — an unrelated dirty tree makes a revert unsafe). Otherwise skip the whole section and record why on the card.

- [ ] Record the pre-fix lockfile state so the revert is exact: `git rev-parse HEAD -- <lockfile>` / confirm the lockfile is tracked and unmodified.
- [ ] Run `npm audit fix` — **without `--force`, always**. Then verify the boundary held, and treat any breach as a revert-now condition:
  - `git diff --stat` must show **the lockfile only**. If `package.json` changed, revert both immediately and reclassify every finding as tier 3.
  - `git diff` the lockfile for any `version` that crossed a major boundary. If one did, revert and reclassify — `audit fix` is not supposed to do this without `--force`, and a surprise here means the assumption is wrong for this project.
- [ ] Run the project's declared test command. Record the actual output (pass/fail with the error text — "should pass" is not a result).
- [ ] If tests **fail**, or the boundary check above tripped: `git checkout -- <lockfile>` and record on the card that the auto-fix was attempted and reverted, with the failing output. This is a normal outcome, not an error — it converts those findings into `## HUMAN` tasks.
- [ ] If tests **pass**: re-run `npm audit --json` and record the residual finding counts. Commit the lockfile alone: `git add <lockfile> && git commit -m "fix(deps): npm audit fix — <N> advisories resolved"`. Never bundle unrelated changes into this commit.

---

### 5 · Verdict → findings card

- [ ] Decide the verdict: **CLEAN / FIXED / NEEDS ATTENTION / N-A**.
  - **CLEAN** — zero findings (or dev-only low/moderate accepted and recorded).
  - **FIXED** — everything resolved by tier 2, tests green, residual count zero.
  - **NEEDS ATTENTION** — any runtime `critical`/`high` remaining, any finding with no fix available, or any tier-3 item outstanding.
  - **N-A** — not an npm consumer (step 0).
  Runtime `critical`/`high` remaining is a **release blocker**; dev-only findings and warnings are not.
- [ ] Mint (or refresh) the folder card `.flowdeck/.crunchdeck/security-findings/` — crunchdeck folder-card pattern: companion document + `TODO.md`. If it exists from a previous run, update in place; never clobber checked boxes or `## HUMAN` answers.
- [ ] Write `VULN-AUDIT.md` — newest run on top, prior runs kept below as history (the trend matters: a moderate that has been open for four runs is a decision someone keeps deferring). Per run: date, scope + package manager (step 0), verdict, severity totals before/after, then per-advisory rows (id, severity, package, path, dev/runtime, fix status), the tier-2 outcome (applied / reverted / skipped + why), supply-chain warnings, and explicitly accepted risks with who accepted them.
- [ ] Write/reconcile `TODO.md` — every task cites its finding (`VULN-AUDIT.md § <section>`). Split by the tier boundary, which is also the judgment boundary: tier 2-eligible leftovers and mechanical lockfile work → `## BOT`; every tier-3 item → `## HUMAN`, each with the **exact command** and what it would break. On a refresh: add tasks for new advisories; mark tasks whose advisory no longer reproduces `[x]` with a `verified <date>` note. Skeleton:
  ```markdown
  ---
  lifecycle: one-shot
  ---

  # security-findings

  > Minted by the `publish-vuln-audit` sleeve ritual. Evidence lives in `VULN-AUDIT.md`; every task below cites its finding. Replaying the ritual refreshes the report and reconciles this card.

  ## BOT

  - [ ] <mechanical, in-range, lockfile-only fix> (VULN-AUDIT.md § <section>)

  ## HUMAN

  - [ ] <tier-3 decision — e.g. `npm audit fix --force` crossing <pkg> v3→v4, or accept-and-document a no-fix-available advisory> (VULN-AUDIT.md § <section>)
    > _answer:_

  #### COMMENTS
  ```
- [ ] Hand off by verdict: **NEEDS ATTENTION** → play `security-findings` to burn the tasks down, then replay this ritual to re-verify. **CLEAN / FIXED / N-A** → note the verdict and date on `.flowdeck/.crunchdeck/prepare-to-publish/TODO.md` if it exists, so `publish-readiness-audit § 8` can see the gate is satisfied.
- [ ] Append a run record to `#### COMMENTS`: **date, verdict, severity totals, tier-2 outcome**, pointer to `security-findings/VULN-AUDIT.md`. `publish-readiness-audit` reads this line to decide whether the audit is fresh — keep the format stable. Reset the `## BOT` checkboxes for the next run (ritual semantics).

## HUMAN

## ACTIONS

<!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

- [ ] force-fix — run `npm audit fix --force` for a specific named advisory, then the full test suite; revert everything (lockfile **and** `package.json`) if anything fails. Tier 3 by default; activating this line is the human authorizing that one crossing
- [ ] osv-scan — run `osv-scanner` over the lockfile for advisories the npm registry feed does not carry
- [ ] audit-history — run the audit against the last N published versions to see whether the vulnerability was already live in consumers' hands, not just in the working tree
- [ ] enable-dependabot — open the PR adding `.github/dependabot.yml` so the next advisory arrives without a manual play

#### COMMENTS
