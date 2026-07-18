#!/usr/bin/env node
// creamdeck approve-proposal — mint per-item hashes on proposal approval.
// Usage (from project root):
//   node .flowdeck/.creamdeck/_scripts/approve-proposal.js <proposal-id-or-folder>
// Reads proposals/<folder>/PROPOSAL.md, mints a hash for each item missing one,
// sets Status to Approved and the Approved date if not already set. An item whose
// recorded hash no longer matches its row content (edited after approval) is left
// untouched and reported — the hash is a tamper-evident fingerprint of what was
// approved, so it is never silently re-signed.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const creamdeckDir = join(__dirname, '..')
const proposalsDir = join(creamdeckDir, 'proposals')

const identifier = process.argv[2]
if (!identifier) {
  console.error('Usage: approve-proposal.js <proposal-id-or-folder>')
  process.exit(1)
}

function findProposalDir(id) {
  const direct = join(proposalsDir, id)
  if (existsSync(join(direct, 'PROPOSAL.md'))) return direct
  const dirs = readdirSync(proposalsDir, { withFileTypes: true }).filter((e) => e.isDirectory())
  for (const e of dirs) {
    const p = join(proposalsDir, e.name, 'PROPOSAL.md')
    if (!existsSync(p)) continue
    const src = readFileSync(p, 'utf8')
    const m = src.match(/\|\s*ID\s*\|\s*([^|]+?)\s*\|/)
    if (m && m[1].trim() === id) return join(proposalsDir, e.name)
  }
  return null
}

const proposalDir = findProposalDir(identifier)
if (!proposalDir) {
  console.error(`No proposal found matching "${identifier}" under ${proposalsDir}`)
  process.exit(1)
}

const mdPath = join(proposalDir, 'PROPOSAL.md')
let src = readFileSync(mdPath, 'utf8')

function field(name) {
  const m = src.match(new RegExp(`\\|\\s*${name}\\s*\\|\\s*([^|]+?)\\s*\\|`))
  return m ? m[1].trim() : ''
}

const proposalId = field('ID')

function itemHash(index, description, qty, unitPrice) {
  const payload = `${proposalId}|${index}|${description}|${qty}|${unitPrice}`
  return createHash('sha256').update(payload).digest('hex').slice(0, 10)
}

// ---------------------------------------------------------------------------
// Parse and rewrite the Items table
// ---------------------------------------------------------------------------

const lines = src.split('\n')
const headerIdx = lines.findIndex((l) => /^\|\s*#\s*\|/.test(l))
if (headerIdx === -1) {
  console.error('No Items table (header "| # | ..." ) found in PROPOSAL.md')
  process.exit(1)
}

let minted = 0
const mismatched = []

for (let i = headerIdx + 2; i < lines.length; i++) {
  const row = lines[i]
  if (!row.trim().startsWith('|')) break
  const cells = row.split('|').map((c) => c.trim())
  cells.shift() // leading empty cell from the opening "|"
  cells.pop() // trailing empty cell from the closing "|"
  if (cells.length < 6) continue
  const [num, description, qty, unitPrice, , hash] = cells
  const expected = itemHash(num, description, qty, unitPrice)
  if (hash === '—' || hash === '') {
    cells[5] = expected
    lines[i] = '| ' + cells.join(' | ') + ' |'
    minted++
  } else if (hash !== expected) {
    mismatched.push({ num, hash, expected })
  }
}

src = lines.join('\n')

// Set Status -> Approved and Approved date, unless already set.
const today = new Date()
const dateStr = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-')

if (!/\|\s*Status\s*\|\s*Approved\s*\|/.test(src)) {
  src = src.replace(/\|\s*Status\s*\|[^|]*\|/, '| Status | Approved |')
}
if (/\|\s*Approved\s*\|\s*—\s*\|/.test(src)) {
  src = src.replace(/\|\s*Approved\s*\|\s*—\s*\|/, `| Approved | ${dateStr} |`)
}

writeFileSync(mdPath, src, 'utf8')

if (mismatched.length) {
  console.error(`WARNING: ${mismatched.length} item(s) have a hash that no longer matches their row content (edited after approval) — left unchanged:`)
  for (const m of mismatched) console.error(`  item #${m.num}: recorded ${m.hash}, recomputed ${m.expected}`)
}
console.log(`${proposalId}: ${minted} hash(es) minted, ${mismatched.length} mismatch(es) flagged.`)
