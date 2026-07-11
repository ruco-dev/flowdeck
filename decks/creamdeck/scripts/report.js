#!/usr/bin/env node
// creamdeck report — rebuild tickets/REPORT.md from live ticket data.
// Usage (from project root):
//   node .flowdeck/.creamdeck/_scripts/report.js
// Reads every TICKET.md under ../tickets/ and writes tickets/REPORT.md.

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const creamdeckDir = join(__dirname, '..')

// Resolve an operational dir by its plain (0.9.0+, ADR-0006) name, falling back
// to the legacy `_`-prefixed name if only that exists on disk.
function resolveDir(plain) {
  const plainPath  = join(creamdeckDir, plain)
  const legacyPath = join(creamdeckDir, `_${plain}`)
  if (existsSync(plainPath))  return plainPath
  if (existsSync(legacyPath)) return legacyPath
  return plainPath
}

const ticketsDir = resolveDir('tickets')
const reportPath = join(ticketsDir, 'REPORT.md')

const STAGE_ORDER = ['New', 'Open', 'Awaiting Quote', 'Waiting', 'Blocked', 'Resolved', 'Closed']
const PRIORITY_ORDER = ['high', 'medium', 'low']
const STALE_DAYS = 7

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

function parseTable(src) {
  const fields = {}
  const tableRe = /\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|/g
  let m
  while ((m = tableRe.exec(src)) !== null) {
    const key = m[1].trim()
    const val = m[2].trim()
    if (key !== 'Field' && key !== '---') fields[key] = val
  }
  return fields
}

function lastUpdateDate(src) {
  const section = src.match(/## Updates\s*\n([\s\S]*?)(?=\n## |$)/)?.[1] ?? ''
  const dates = [...section.matchAll(/\*\*(\d{4}-\d{2}-\d{2})\*\*/g)].map(m => m[1])
  return dates.sort().at(-1) ?? null
}

function title(src) {
  return src.match(/^#\s+(.+)/m)?.[1]?.trim() ?? '(untitled)'
}

// ---------------------------------------------------------------------------
// Load tickets
// ---------------------------------------------------------------------------

const today = new Date()
today.setHours(0, 0, 0, 0)

function daysSince(dateStr) {
  if (!dateStr) return Infinity
  const d = new Date(dateStr)
  return Math.floor((today - d) / 86400000)
}

const tickets = readdirSync(ticketsDir, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => {
    const mdPath = join(ticketsDir, e.name, 'TICKET.md')
    if (!existsSync(mdPath)) return null
    const src = readFileSync(mdPath, 'utf8')
    const fields = parseTable(src)
    return {
      id: fields['ID'] ?? e.name,
      title: title(src),
      status: fields['Status'] ?? '',
      priority: fields['Priority'] ?? 'medium',
      stage: fields['Stage'] ?? 'New',
      contact: fields['Contact'] ?? '',
      opened: fields['Opened'] ?? '',
      closed: fields['Closed'] ?? '',
      lastUpdate: lastUpdateDate(src),
      hoursReal: (r => isNaN(r) ? null : Math.ceil(r))(parseFloat(fields['Hours Real'])),
    }
  })
  .filter(Boolean)

// ---------------------------------------------------------------------------
// Group + sort
// ---------------------------------------------------------------------------

function priorityRank(p) { return PRIORITY_ORDER.indexOf(p.toLowerCase()) }

const grouped = {}
for (const stage of STAGE_ORDER) grouped[stage] = []

for (const t of tickets) {
  const bucket = STAGE_ORDER.includes(t.stage) ? t.stage : 'New'
  grouped[bucket].push(t)
}

for (const stage of STAGE_ORDER) {
  grouped[stage].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const dateStr = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-')
const total = tickets.length

function stageSummary() {
  const totalHours = STAGE_ORDER.reduce((sum, s) => sum + stageHours(s), 0)
  const rows = STAGE_ORDER
    .filter(s => grouped[s].length > 0)
    .map(s => {
      const h = stageHours(s)
      return `| ${s} | ${grouped[s].length} | ${h > 0 ? `${h}h` : '—'} |`
    })
  return [
    '| Stage | Count | Hours Real |',
    '|-------|-------|------------|',
    ...rows,
    `| **Total** | **${total}** | **${totalHours}h** |`,
  ].join('\n')
}

function fmtHours(h) {
  return h != null ? `${h}h` : '—'
}

function stageHours(stage) {
  return grouped[stage].reduce((sum, t) => sum + (t.hoursReal ?? 0), 0)
}

function ticketRow(t) {
  const stale = t.stage === 'Waiting' && daysSince(t.lastUpdate) > STALE_DAYS
  const flag = stale ? ' ⚠️ stale' : ''
  return `| ${t.id} | ${t.title} | ${t.contact} | ${fmtHours(t.hoursReal)} |${flag}`
}

function stageSection(stage) {
  const list = grouped[stage]
  if (!list.length) return ''

  const byPriority = {}
  for (const p of PRIORITY_ORDER) byPriority[p] = list.filter(t => t.priority.toLowerCase() === p)

  const totalHours = stageHours(stage)
  const hoursLabel = totalHours > 0 ? ` · ${totalHours}h` : ''
  const lines = [`## ${stage} (${list.length}${hoursLabel})`, '']

  for (const p of PRIORITY_ORDER) {
    const group = byPriority[p]
    if (!group.length) continue
    const label = p.charAt(0).toUpperCase() + p.slice(1)
    lines.push(`### ${label} Priority`, '')
    lines.push('| ID | Title | Contact | Hours Real |')
    lines.push('|----|-------|---------|------------|')
    for (const t of group) lines.push(ticketRow(t))
    lines.push('')
  }

  return lines.join('\n')
}

const sections = STAGE_ORDER
  .filter(s => grouped[s].length > 0)
  .map(stageSection)
  .join('\n---\n\n')

const report = `# Tickets — Status Report

Generated: ${dateStr} · Total: ${total}

## Summary

${stageSummary()}

---

${sections}`.trimEnd() + '\n'

writeFileSync(reportPath, report, 'utf8')
console.log(`REPORT.md written — ${total} tickets across ${STAGE_ORDER.filter(s => grouped[s].length).length} stages`)
