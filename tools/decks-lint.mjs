#!/usr/bin/env node
// decks-lint — mechanical integrity linter for deck sources under decks/.
// Plain Node ESM, zero dependencies. Exits non-zero if any error-severity
// finding is reported. See .flowdeck/deck-test-harness/SPEC.md for the check
// definitions and DECKS.md (lines 48–62) for the manifest format this enforces.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DECKS_DIR = path.join(REPO_ROOT, 'decks')

// Required manifest keys per DECKS.md "manifest.json format". `scripts` is
// optional; AGENT-section.md is a required file but not a manifest field.
const REQUIRED_STRING_KEYS = ['name', 'version', 'agentMd', 'description']
const REQUIRED_ARRAY_KEYS = ['blueprints', 'energyCards']
// `ritual` is the sleeve-era lifecycle for immortal play-in-place cards; `idempotent`
// and `standing` are deprecated (kept accepted until every deck has migrated) — see
// flowdeck-cli sleeve SPEC. Note: blueprint-lifecycle only checks blueprints/ TODO.md;
// sleeve residents (sleeve-cards/) carry YAML frontmatter and are not checked here.
// A blueprint that needs extra keys (recurring cards carrying `recurrence:`/`skills:`,
// e.g. emaildeck-digest) may itself use YAML frontmatter instead of the line-2 HTML
// comment — checkLifecycle reads `lifecycle:` from the frontmatter block in that case.
const CANONICAL_LIFECYCLES = new Set(['idempotent', 'one-shot', 'recurring', 'standing', 'ritual'])
// Files/dirs under a deck root that are legitimately not listed in the manifest.
const ORPHAN_EXEMPT = new Set(['manifest.json', 'AGENT.md', 'AGENT-section.md', 'README.md', 'decisions'])

const findings = []
function report(deck, check, message, severity = 'error') {
  findings.push({ deck, check, message, severity })
}

function exists(p) {
  try { fs.accessSync(p); return true } catch { return false }
}
function readText(p) {
  return fs.readFileSync(p, 'utf8')
}
function listDir(p) {
  try { return fs.readdirSync(p, { withFileTypes: true }) } catch { return [] }
}

function deckNames() {
  return listDir(DECKS_DIR)
    .filter((e) => e.isDirectory() && exists(path.join(DECKS_DIR, e.name, 'manifest.json')))
    .map((e) => e.name)
    .sort()
}

// --- Check 1: manifest-completeness ---------------------------------------
function checkManifest(deck, root) {
  const manifestPath = path.join(root, 'manifest.json')
  let manifest
  try {
    manifest = JSON.parse(readText(manifestPath))
  } catch (err) {
    report(deck, 'manifest-completeness', `manifest.json is not valid JSON: ${err.message}`)
    return null
  }
  for (const key of REQUIRED_STRING_KEYS) {
    if (typeof manifest[key] !== 'string' || manifest[key].trim() === '') {
      report(deck, 'manifest-completeness', `missing or empty required string key "${key}"`)
    }
  }
  for (const key of REQUIRED_ARRAY_KEYS) {
    if (!Array.isArray(manifest[key])) {
      report(deck, 'manifest-completeness', `required key "${key}" must be an array`)
    }
  }
  if ('scripts' in manifest && !Array.isArray(manifest.scripts)) {
    report(deck, 'manifest-completeness', `optional key "scripts" must be an array when present`)
  }
  if ('tracking' in manifest && !Array.isArray(manifest.tracking)) {
    report(deck, 'manifest-completeness', `optional key "tracking" must be an array when present`)
  }
  if (typeof manifest.name === 'string' && manifest.name !== deck) {
    report(deck, 'manifest-completeness', `manifest name "${manifest.name}" does not match directory "${deck}"`)
  }
  return manifest
}

// --- Check 2: manifest-filesystem (both directions) -----------------------
function checkFilesystem(deck, root, manifest) {
  if (!manifest) return
  const blueprints = Array.isArray(manifest.blueprints) ? manifest.blueprints : []
  const energyCards = Array.isArray(manifest.energyCards) ? manifest.energyCards : []
  const scripts = Array.isArray(manifest.scripts) ? manifest.scripts : []
  const sleeveCards = Array.isArray(manifest.sleeveCards) ? manifest.sleeveCards : []
  // `tracking` declares extra deck-root files that are neither templates nor scripts
  // (e.g. founderdeck's ORG-INSTRUCTIONS.md / POLICY-MANUAL.md policy docs).
  const tracking = Array.isArray(manifest.tracking) ? manifest.tracking : []

  // Forward: every listed entry resolves to a file on disk.
  for (const bp of blueprints) {
    if (!exists(path.join(root, 'blueprints', bp, 'TODO.md'))) {
      report(deck, 'manifest-filesystem', `blueprint "${bp}" has no blueprints/${bp}/TODO.md`)
    }
  }
  for (const sc of sleeveCards) {
    if (!exists(path.join(root, 'sleeve-cards', sc, 'TODO.md'))) {
      report(deck, 'manifest-filesystem', `sleeveCard "${sc}" has no sleeve-cards/${sc}/TODO.md`)
    }
  }
  for (const ec of energyCards) {
    if (!exists(path.join(root, 'energy-cards', ec))) {
      report(deck, 'manifest-filesystem', `energy-card "${ec}" listed but energy-cards/${ec} is missing`)
    }
  }
  for (const s of scripts) {
    if (!exists(path.join(root, s))) {
      report(deck, 'manifest-filesystem', `script "${s}" listed but ${s} is missing`)
    }
  }
  if (typeof manifest.agentMd === 'string' && !exists(path.join(root, manifest.agentMd))) {
    report(deck, 'manifest-filesystem', `agentMd "${manifest.agentMd}" does not exist`)
  }
  for (const t of tracking) {
    if (!exists(path.join(root, t))) {
      report(deck, 'manifest-filesystem', `tracked file "${t}" listed in tracking[] but does not exist`)
    }
  }

  // Reverse: no orphan files.
  for (const e of listDir(path.join(root, 'blueprints'))) {
    if (e.isDirectory() && !blueprints.includes(e.name)) {
      report(deck, 'manifest-filesystem', `orphan blueprint dir "${e.name}" exists but is not in blueprints[]`)
    }
  }
  for (const e of listDir(path.join(root, 'energy-cards'))) {
    if (e.isFile() && !e.name.startsWith('.') && !energyCards.includes(e.name)) {
      report(deck, 'manifest-filesystem', `orphan energy-card "${e.name}" exists on disk but is not in energyCards[]`)
    }
  }
  for (const e of listDir(path.join(root, 'scripts'))) {
    if (e.isFile() && !e.name.startsWith('.') && !scripts.includes(`scripts/${e.name}`)) {
      report(deck, 'manifest-filesystem', `orphan script "scripts/${e.name}" exists on disk but is not in scripts[]`)
    }
  }
  for (const e of listDir(path.join(root, 'sleeve-cards'))) {
    if (e.isDirectory() && !sleeveCards.includes(e.name)) {
      report(deck, 'manifest-filesystem', `orphan sleeve-card dir "${e.name}" exists but is not in sleeveCards[]`)
    }
  }
  // Any deck-root entry that is neither a manifest field nor an exempt file.
  const knownDirs = new Set(['blueprints', 'energy-cards', 'scripts', 'sleeve-cards'])
  const knownFiles = new Set(tracking)
  for (const e of listDir(root)) {
    if (e.name.startsWith('.') || ORPHAN_EXEMPT.has(e.name) || knownDirs.has(e.name) || knownFiles.has(e.name)) continue
    report(deck, 'manifest-filesystem', `unexpected top-level entry "${e.name}" — not a manifest field or known file`)
  }
}

// --- Check 3: agent-section-heading ---------------------------------------
function checkAgentSection(deck, root) {
  const p = path.join(root, 'AGENT-section.md')
  if (!exists(p)) {
    report(deck, 'agent-section-heading', `AGENT-section.md is missing (required file)`)
    return
  }
  const lines = readText(p).split('\n')
  const firstNonEmpty = lines.findIndex((l) => l.trim() !== '')
  if (firstNonEmpty === -1 || !/^## \S/.test(lines[firstNonEmpty])) {
    report(deck, 'agent-section-heading', `must start with an "## " heading`)
    return
  }
  for (let i = 0; i < lines.length; i++) {
    if (i === firstNonEmpty) continue
    if (/^# \S/.test(lines[i])) {
      report(deck, 'agent-section-heading', `h1 at line ${i + 1} ("${lines[i].trim()}"); AGENT-section.md must be a single h2 subtree`)
    } else if (/^## \S/.test(lines[i])) {
      report(deck, 'agent-section-heading', `sibling h2 at line ${i + 1} ("${lines[i].trim()}"); AGENT-section.md must be a single h2 with deeper subheadings only`)
    }
  }
}

// --- Check 4: energy-card-no-frontmatter ----------------------------------
function checkFrontmatter(deck, root) {
  for (const e of listDir(path.join(root, 'energy-cards'))) {
    if (!e.isFile() || e.name.startsWith('.')) continue
    const first = readText(path.join(root, 'energy-cards', e.name)).split('\n')[0]
    if (first.trim() === '---') {
      report(deck, 'energy-card-no-frontmatter', `${e.name} begins with YAML frontmatter ("---"); energy-cards must be plain markdown`)
    }
  }
}

// --- Check 5: blueprint-lifecycle -----------------------------------------
function checkLifecycle(deck, root) {
  for (const e of listDir(path.join(root, 'blueprints'))) {
    if (!e.isDirectory()) continue
    const todo = path.join(root, 'blueprints', e.name, 'TODO.md')
    if (!exists(todo)) continue // absence is a manifest-filesystem finding
    const lines = readText(todo).split('\n')
    if (lines[0]?.trim() === '---') {
      // YAML frontmatter form — recurring/skill-tagged blueprints (e.g. emaildeck-digest)
      // that also need `recurrence:`/`skills:` keys. Read lifecycle from the frontmatter
      // block rather than the line-2 HTML comment.
      const rest = lines.slice(1)
      const closeIdx = rest.findIndex((l) => l.trim() === '---')
      const block = closeIdx === -1 ? rest : rest.slice(0, closeIdx)
      const lc = block.map((l) => l.match(/^lifecycle:\s*([a-z-]+)\s*$/)).find(Boolean)
      if (closeIdx === -1) {
        report(deck, 'blueprint-lifecycle', `${e.name}/TODO.md opens YAML frontmatter but never closes it`)
      } else if (!lc || !CANONICAL_LIFECYCLES.has(lc[1])) {
        report(deck, 'blueprint-lifecycle', `${e.name}/TODO.md frontmatter has no valid "lifecycle:" key (canonical: ${[...CANONICAL_LIFECYCLES].join(', ')})`)
      }
      continue
    }
    const line2 = lines[1] ?? ''
    const m = line2.match(/^<!--\s*lifecycle:\s*([a-z-]+)\s*-->$/)
    if (!m || !CANONICAL_LIFECYCLES.has(m[1])) {
      report(deck, 'blueprint-lifecycle', `${e.name}/TODO.md line 2 is not a valid lifecycle marker (got "${line2.trim()}")`)
    }
  }
}

// --- Check 6: blueprint-crossref ------------------------------------------
function checkCrossrefs(deck, root, manifest) {
  const hasAgentMd = manifest && typeof manifest.agentMd === 'string' && exists(path.join(root, manifest.agentMd))
  const hasScripts = manifest && Array.isArray(manifest.scripts) && manifest.scripts.length > 0
  for (const e of listDir(path.join(root, 'blueprints'))) {
    if (!e.isDirectory()) continue
    const todo = path.join(root, 'blueprints', e.name, 'TODO.md')
    if (!exists(todo)) continue
    const text = readText(todo)

    for (const m of text.matchAll(/_energy-cards\/([A-Za-z0-9._-]+)/g)) {
      const ref = m[1]
      if (ref.endsWith('.template')) {
        if (!exists(path.join(root, 'energy-cards', ref))) {
          report(deck, 'blueprint-crossref', `${e.name} references "_energy-cards/${ref}" which does not exist`)
        }
      } else if (/-AGENT\.md$/.test(ref)) {
        if (ref !== `${deck}-AGENT.md` || !hasAgentMd) {
          report(deck, 'blueprint-crossref', `${e.name} references "_energy-cards/${ref}" which does not resolve to this deck's agentMd`)
        }
      } else {
        report(deck, 'blueprint-crossref', `${e.name} references "_energy-cards/${ref}" — unrecognized energy-card reference`)
      }
    }

    // Two valid `_scripts/` reference shapes: the shared `_scripts/<deck>/<script>`
    // path (decks without an installRoot), or `_scripts/<script>` when the deck
    // installs its scripts under its own installRoot (.<deck>/_scripts/<script>).
    const scriptBases = new Set((manifest && Array.isArray(manifest.scripts) ? manifest.scripts : []).map(s => s.split('/').pop()))
    for (const m of text.matchAll(/_scripts\/([A-Za-z0-9._-]+)(\/[A-Za-z0-9._-]*)?/g)) {
      const ref = m[1]
      const ok = hasScripts && (ref === deck || scriptBases.has(ref))
      if (!ok) {
        report(deck, 'blueprint-crossref', `${e.name} references "_scripts/${ref}" but this deck ships no matching scripts[]`)
      }
    }
  }
}

// --- Check 7: decks-md-registry -------------------------------------------
function checkRegistry(decks, manifests) {
  const registryPath = path.join(REPO_ROOT, 'DECKS.md')
  if (!exists(registryPath)) {
    report('(repo)', 'decks-md-registry', `DECKS.md is missing`)
    return
  }
  // LOCAL-DECKS.md is the gitignored registry for local (not-yet-public) decks,
  // whose decks/<name>/ folders are gitignored too — merge its rows so local
  // decks are linted like public ones. Absent in CI clones, where the local
  // deck folders are absent as well, so the bijection still holds.
  const registries = [
    ['DECKS.md', registryPath],
    ['LOCAL-DECKS.md', path.join(REPO_ROOT, 'LOCAL-DECKS.md')],
  ]
  // Table rows look like: | [`name`](name/) | description | blueprints |
  const rows = new Map() // deck name -> { row: full row text, file: registry filename }
  for (const [file, p] of registries) {
    if (!exists(p)) continue
    for (const line of readText(p).split('\n')) {
      const m = line.match(/^\|\s*\[`([a-z0-9-]+)`\]/)
      if (m) rows.set(m[1], { row: line, file })
    }
  }
  const rowNames = [...rows.keys()].sort()
  for (const name of rowNames) {
    if (!decks.includes(name)) {
      report('(repo)', 'decks-md-registry', `${rows.get(name).file} has a row for "${name}" with no matching decks/${name}/`)
    }
  }
  for (const name of decks) {
    if (!rows.has(name)) {
      report('(repo)', 'decks-md-registry', `deck "${name}" has no row in the DECKS.md (or LOCAL-DECKS.md) registry table`)
    }
  }
  // Every backticked <deck>-… token in a row must be a real blueprint or sleeveCard
  // of that deck (sleeve-era decks reference their init ritual via a "(sleeveCards: …)"
  // annotation in the blueprints column — see emaildeck).
  for (const [name, { row }] of rows) {
    const manifest = manifests.get(name)
    if (!manifest || !Array.isArray(manifest.blueprints)) continue
    const declared = new Set([...manifest.blueprints, ...(Array.isArray(manifest.sleeveCards) ? manifest.sleeveCards : [])])
    for (const m of row.matchAll(/`([a-z0-9]+-[a-z0-9-]+)`/g)) {
      const token = m[1]
      if (token.startsWith(`${name}-`) && !declared.has(token)) {
        report('(repo)', 'decks-md-registry', `${name} row references "${token}" which is not in the manifest (blueprints or sleeveCards)`)
      }
    }
  }
}

// --- Check 8: no-local-path-leak -------------------------------------------
function checkNoLocalPathLeak() {
  const p = path.join(REPO_ROOT, '.claude', 'settings.json')
  if (!exists(p)) return
  if (readText(p).includes('/Users/')) {
    report('(repo)', 'no-local-path-leak', `.claude/settings.json contains an absolute /Users/ path — move the entry to gitignored .claude/settings.local.json`)
  }
}

// --- Run ------------------------------------------------------------------
const decks = deckNames()
if (decks.length === 0) {
  console.error(`decks-lint: no decks found under ${DECKS_DIR}`)
  process.exit(1)
}
const manifests = new Map()
for (const deck of decks) {
  const root = path.join(DECKS_DIR, deck)
  const manifest = checkManifest(deck, root)
  manifests.set(deck, manifest)
  checkFilesystem(deck, root, manifest)
  checkAgentSection(deck, root)
  checkFrontmatter(deck, root)
  checkLifecycle(deck, root)
  checkCrossrefs(deck, root, manifest)
}
checkRegistry(decks, manifests)
checkNoLocalPathLeak()

for (const f of findings) {
  console.log(`${f.severity} ${f.deck}: ${f.check} — ${f.message}`)
}
const errors = findings.filter((f) => f.severity === 'error').length
console.log(`\ndecks-lint: ${decks.length} decks checked, ${findings.length} finding(s), ${errors} error(s).`)
process.exit(errors > 0 ? 1 : 0)
