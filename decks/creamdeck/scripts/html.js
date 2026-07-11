#!/usr/bin/env node
// creamdeck html — export .creamdeck/tickets/ to a static HTML report.
//
// Usage (from project root):
//   node .flowdeck/.creamdeck/_scripts/html.js
//   node .flowdeck/.creamdeck/_scripts/html.js --lang PT-PT
//
// Output: .flowdeck/.creamdeck/_report/[<lang>/]
//   index.html       — summary table (replaced on every run)
//   <ID>.html        — per-ticket page (replaced on every run)
//   Other files      — untouched (user assets preserved)
//
// --lang <code>: writes to _report/<code>/ instead of _report/
//   Translation is agent-performed. The agent reads each TICKET.md,
//   translates title/description/updates/resolution, writes
//   _report/<code>/.translations.json, then re-runs this script with --lang.
//   See the export-report --lang action in tickets/TODO.md for the full workflow.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
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

const langIdx = process.argv.indexOf('--lang')
const lang = langIdx !== -1 ? process.argv[langIdx + 1] : null
const reportDir = lang ? join(creamdeckDir, '_report', lang) : join(creamdeckDir, '_report')

// ─── Parse ────────────────────────────────────────────────────────────────────

function parseTable(src) {
  const fields = {}
  for (const line of src.split('\n')) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|/)
    if (m && m[1] !== 'Field' && !m[1].startsWith('---')) {
      fields[m[1].trim()] = m[2].trim()
    }
  }
  return fields
}

function extractSection(src, heading) {
  const m = src.match(new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`))
  return m ? m[1].trim() : ''
}

function ticketTitle(src) {
  return src.match(/^#\s+(.+)/m)?.[1]?.trim() ?? '(untitled)'
}

function lastUpdateDate(src) {
  const updates = extractSection(src, 'Updates')
  const dates = [...updates.matchAll(/\*\*(\d{4}-\d{2}-\d{2})\*\*/g)].map(m => m[1])
  return dates.sort().at(-1) ?? null
}

// ─── Translations manifest ────────────────────────────────────────────────────

let translations = {}
if (lang) {
  const manifestPath = join(reportDir, '.translations.json')
  if (existsSync(manifestPath)) {
    try { translations = JSON.parse(readFileSync(manifestPath, 'utf8')) } catch {}
  }
}

function tr(id, field, fallback) {
  return translations[id]?.[field] || fallback
}

// ─── Load tickets ─────────────────────────────────────────────────────────────

const STAGE_ORDER = ['New', 'Open', 'Awaiting Quote', 'Waiting', 'Blocked', 'Resolved', 'Closed']
const PRIORITY_ORDER = ['high', 'medium', 'low']

const tickets = readdirSync(ticketsDir, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => {
    const mdPath = join(ticketsDir, e.name, 'TICKET.md')
    if (!existsSync(mdPath)) return null
    const src = readFileSync(mdPath, 'utf8')
    const f = parseTable(src)
    const id = f['ID'] ?? e.name
    return {
      id,
      title:       tr(id, 'title',       ticketTitle(src)),
      priority:    f['Priority'] ?? 'medium',
      stage:       f['Stage'] ?? 'New',
      contact:     f['Contact'] ?? '',
      opened:      f['Opened'] ?? '',
      closed:      f['Closed'] ?? '',
      hoursEst:    f['Hours Est.'] ?? '',
      hoursReal:   f['Hours Real'] ?? '',
      lastUpdate:  lastUpdateDate(src),
      description: tr(id, 'description', extractSection(src, 'Description')),
      updates:     tr(id, 'updates',     extractSection(src, 'Updates')),
      resolution:  tr(id, 'resolution',  extractSection(src, 'Resolution')),
    }
  })
  .filter(Boolean)
  .sort((a, b) => {
    const sd = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
    return sd !== 0 ? sd : PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
  })

// ─── Minimal markdown renderer ────────────────────────────────────────────────

function md(text) {
  if (!text) return ''
  const stripped = text.replace(/<!--[\s\S]*?-->/g, '')
  const esc = stripped.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const inline = s => s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(?<!href="|["'(])(https?:\/\/[^\s<>"&]+)/g, '<a href="$1">$1</a>')

  return esc
    .split(/\n\n+/)
    .map(block => {
      if (block.trim() === '---') return '<hr>'
      const lines = block.split('\n').filter(l => l.trim())
      if (!lines.length) return ''
      if (lines.every(l => l.match(/^\s*[-*•]\s/) || l.match(/^\*\*\d{4}-\d{2}-\d{2}\*\*/))) {
        return '<ul>' + lines.map(l => `<li>${inline(l.replace(/^\s*[-*•]\s*/, ''))}</li>`).join('') + '</ul>'
      }
      return `<p>${inline(lines.join('<br>'))}</p>`
    })
    .join('\n')
}

// ─── Inline CSS ───────────────────────────────────────────────────────────────

const CSS = `
:root{--bg:#fafafa;--sur:#fff;--bdr:#e5e7eb;--tx:#111827;--mu:#6b7280;--ac:#2563eb;
--h:#fef2f2;--ht:#b91c1c;--m:#fffbeb;--mt:#92400e;--l:#f0fdf4;--lt:#166534;
--sn:#eff6ff;--snt:#1d4ed8;--so:#f0fdf4;--sot:#15803d;--sr:#f5f3ff;--srt:#7c3aed;
--sc:#f9fafb;--sct:#374151;--sw:#fff7ed;--swt:#c2410c}
@media(prefers-color-scheme:dark){:root{--bg:#111827;--sur:#1f2937;--bdr:#374151;
--tx:#f9fafb;--mu:#9ca3af;--ac:#60a5fa;--h:#450a0a;--ht:#fca5a5;--m:#451a03;
--mt:#fcd34d;--l:#052e16;--lt:#86efac;--sn:#1e3a5f;--snt:#93c5fd;--so:#052e16;
--sot:#86efac;--sr:#2e1065;--srt:#d8b4fe;--sc:#1f2937;--sct:#d1d5db;
--sw:#431407;--swt:#fdba74}}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--tx);font:15px/1.6 system-ui,sans-serif;padding:2rem 1rem}
.w{max-width:960px;margin:0 auto}
h1{font-size:1.5rem;font-weight:700;margin-bottom:.25rem}
h2{font-size:1rem;font-weight:600;margin:2rem 0 .75rem;color:var(--mu);text-transform:uppercase;letter-spacing:.05em}
a{color:var(--ac);text-decoration:none}a:hover{text-decoration:underline}
.meta{color:var(--mu);font-size:.85rem;margin-bottom:1.5rem}
.stats{display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:2rem}
.stat{background:var(--sur);border:1px solid var(--bdr);border-radius:.5rem;padding:.75rem 1.25rem;flex:1;min-width:110px}
.stat-n{font-size:1.5rem;font-weight:700}
.stat-l{font-size:.7rem;color:var(--mu);text-transform:uppercase;letter-spacing:.05em}
table{width:100%;border-collapse:collapse;font-size:.875rem}
th{text-align:left;padding:.5rem .75rem;border-bottom:2px solid var(--bdr);color:var(--mu);font-weight:600;white-space:nowrap}
td{padding:.5rem .75rem;border-bottom:1px solid var(--bdr);vertical-align:top}
tr:last-child td{border-bottom:none}
.gh{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--mu);padding:.75rem .75rem .25rem;border-bottom:1px solid var(--bdr)}
.tag{display:inline-block;padding:.15rem .5rem;border-radius:999px;font-size:.75rem;font-weight:600;white-space:nowrap}
.p-high{background:var(--h);color:var(--ht)}
.p-medium{background:var(--m);color:var(--mt)}
.p-low{background:var(--l);color:var(--lt)}
.s-New{background:var(--sn);color:var(--snt)}
.s-Open{background:var(--so);color:var(--sot)}
.s-Resolved{background:var(--sr);color:var(--srt)}
.s-Closed{background:var(--sc);color:var(--sct)}
.s-Waiting,.s-Blocked,.s-Awaiting{background:var(--sw);color:var(--swt)}
.card{background:var(--sur);border:1px solid var(--bdr);border-radius:.5rem;padding:1.5rem;margin-bottom:1.5rem}
.card table{margin-top:1rem}
.card td:first-child{color:var(--mu);font-weight:500;width:130px;white-space:nowrap}
.sec{margin-top:1.5rem}
.sec-t{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--mu);margin-bottom:.75rem}
.cnt p{margin-bottom:.75rem}
.cnt ul{padding-left:1.5rem;margin-bottom:.75rem}
.cnt li{margin-bottom:.25rem}
.cnt code{background:var(--bdr);padding:.1em .35em;border-radius:3px;font-size:.875em}
.cnt hr{border:none;border-top:1px solid var(--bdr);margin:1rem 0}
.back{display:inline-block;margin-bottom:1.5rem;font-size:.875rem;color:var(--mu)}
.back:hover{color:var(--ac)}
`

// ─── Tag helpers ──────────────────────────────────────────────────────────────

const stageTag = s => `<span class="tag s-${s.split(' ')[0]}">${s}</span>`
const priorityTag = p => `<span class="tag p-${p}">${p}</span>`
const fmtHours = v => { if (!v) return '—'; const n = parseFloat(v); return isNaN(n) ? v : `${Math.ceil(n)}h` }
const today = new Date().toISOString().slice(0, 10)

// ─── Project name ─────────────────────────────────────────────────────────────

function projectName() {
  const p = join(creamdeckDir, 'CREAMDECK.md')
  if (!existsSync(p)) return 'Tickets'
  const src = readFileSync(p, 'utf8')
  const m = src.match(/^##\s+Project\s*\n+([\s\S]+?)(?=\n##|$)/)
  return m ? m[1].trim().split('\n')[0].trim() : 'Tickets'
}

// ─── Index page ───────────────────────────────────────────────────────────────

function buildIndex() {
  const name = projectName()
  const stageCounts = {}
  let totalHours = 0
  for (const t of tickets) {
    stageCounts[t.stage] = (stageCounts[t.stage] ?? 0) + 1
    totalHours += Math.ceil(parseFloat(t.hoursReal) || 0)
  }

  const stats = [
    ...Object.entries(stageCounts).map(([s, n]) =>
      `<div class="stat"><div class="stat-n">${n}</div><div class="stat-l">${s}</div></div>`),
    ...(totalHours > 0 ? [`<div class="stat"><div class="stat-n">${totalHours}h</div><div class="stat-l">Logged</div></div>`] : [])
  ].join('')

  const byStage = {}
  for (const t of tickets) (byStage[t.stage] ??= []).push(t)

  const rows = STAGE_ORDER.filter(s => byStage[s]).flatMap(stage => {
    const group = byStage[stage].sort((a, b) =>
      PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority))
    return [
      `<tr><td colspan="5" class="gh">${stage} · ${group.length}</td></tr>`,
      ...group.map(t => `<tr>
        <td><a href="${t.id}.html">${t.id}</a></td>
        <td>${t.title}</td>
        <td>${priorityTag(t.priority)}</td>
        <td>${t.contact || '—'}</td>
        <td>${fmtHours(t.hoursReal)}</td>
      </tr>`)
    ]
  }).join('')

  return page(`${name} — Tickets`, `
    <h1>${name}</h1>
    <p class="meta">Generated ${today}${lang ? ` · ${lang}` : ''} · ${tickets.length} tickets</p>
    <div class="stats">${stats}</div>
    <table>
      <thead><tr><th>ID</th><th>Title</th><th>Priority</th><th>Contact</th><th>Hours</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`)
}

// ─── Ticket page ──────────────────────────────────────────────────────────────

function buildTicket(t) {
  const metaRows = [
    ['ID', t.id], ['Stage', stageTag(t.stage)], ['Priority', priorityTag(t.priority)],
    ['Contact', t.contact || '—'], ['Opened', t.opened || '—'],
    ['Hours Est.', fmtHours(t.hoursEst)], ['Hours Real', fmtHours(t.hoursReal)],
    ...(t.closed ? [['Closed', t.closed]] : []),
  ].map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')

  const secs = [
    t.description && `<div class="sec"><div class="sec-t">Description</div><div class="cnt">${md(t.description)}</div></div>`,
    t.updates     && `<div class="sec"><div class="sec-t">Updates</div><div class="cnt">${md(t.updates)}</div></div>`,
    t.resolution  && `<div class="sec"><div class="sec-t">Resolution</div><div class="cnt">${md(t.resolution)}</div></div>`,
  ].filter(Boolean).join('')

  return page(`${t.id} — ${t.title}`, `
    <a class="back" href="index.html">← All tickets</a>
    <div class="card">
      <h1>${t.title}</h1>
      <table><tbody>${metaRows}</tbody></table>
      ${secs}
    </div>`)
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

function page(title, body) {
  return `<!doctype html>
<html lang="${lang ?? 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>${CSS}</style>
</head>
<body><div class="w">${body}</div></body>
</html>`
}

// ─── Write output ─────────────────────────────────────────────────────────────

mkdirSync(reportDir, { recursive: true })

writeFileSync(join(reportDir, 'index.html'), buildIndex())
for (const t of tickets) {
  writeFileSync(join(reportDir, `${t.id}.html`), buildTicket(t))
}

console.log(`✓ ${tickets.length} tickets → ${reportDir}${lang ? ` (${lang})` : ''}`)
