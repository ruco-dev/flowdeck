#!/usr/bin/env node
// creamdeck client-report — render a client-safe HTML statement from a
// proposal, request note, or invoice.
//
// Usage (from project root):
//   node .flowdeck/.creamdeck/_scripts/client-report.js <doc-id-or-folder> [--lang pt-PT]
//
// Output: <doc-folder>/client-report.html — replaced on every run.
//
// WHITELIST, not blacklist. The renderer reads ONLY the fields listed in
// SAFE_FIELDS below plus the item table's client columns (#, Description, Qty,
// Unit Price, Total). It never reads the Hash column, the `## Notes` section, or
// the `## Updates` section — the places internal data lives (hours est-vs-real,
// ticket refs, Billing Ref, hash re-mint history, pricing caveats, approval
// deliberation). Adding an internal field to a doc can never leak it here; a
// human still reviews the HTML before it reaches the client (draft-not-send).

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const creamdeckDir = join(__dirname, '..')

// ─── Args ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const langIdx = argv.indexOf('--lang')
const lang = langIdx !== -1 ? argv[langIdx + 1] : 'en'
const identifier = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--lang')
if (!identifier) {
  console.error('Usage: client-report.js <doc-id-or-folder> [--lang pt-PT]')
  process.exit(1)
}

// ─── Document types (whitelist-driven) ──────────────────────────────────────
// Each type declares its folder, filename, and the ONLY header fields that may
// reach the client. Status / Approved / Paid / Proposal / Request Note refs are
// deliberately absent — they are workflow, not client-facing.
const TYPES = {
  proposal:     { dir: 'proposals',     file: 'PROPOSAL.md',     fields: ['ID', 'Date', 'Valid Until', 'Currency'] },
  'request-note': { dir: 'request-notes', file: 'REQUEST-NOTE.md', fields: ['ID', 'Date', 'Currency'] },
  invoice:      { dir: 'invoices',      file: 'INVOICE.md',      fields: ['ID', 'Date', 'Due Date', 'Currency'] },
}

const LABELS = {
  en:      { ID: 'Ref.', Date: 'Date', 'Valid Until': 'Valid until', 'Due Date': 'Due date', Currency: 'Currency', Contact: 'For', desc: 'Description', qty: 'Qty', unit: 'Unit price', total: 'Total', grand: 'Total', generated: 'Generated', proposal: 'Proposal', 'request-note': 'Request note', invoice: 'Invoice' },
  'pt-PT': { ID: 'Ref.', Date: 'Data', 'Valid Until': 'Válido até', 'Due Date': 'Vencimento', Currency: 'Moeda', Contact: 'Para', desc: 'Descrição', qty: 'Qt.', unit: 'Preço unit.', total: 'Total', grand: 'Total', generated: 'Gerado em', proposal: 'Proposta', 'request-note': 'Nota de encomenda', invoice: 'Fatura' },
}
const L = LABELS[lang] || LABELS.en

// ─── Locate the document ────────────────────────────────────────────────────
function findDoc(id) {
  for (const [type, spec] of Object.entries(TYPES)) {
    const dir = join(creamdeckDir, spec.dir)
    if (!existsSync(dir)) continue
    // direct folder match
    const direct = join(dir, id, spec.file)
    if (existsSync(direct)) return { type, spec, folder: join(dir, id), mdPath: direct }
    // match by ID field
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue
      const p = join(dir, e.name, spec.file)
      if (!existsSync(p)) continue
      const m = readFileSync(p, 'utf8').match(/\|\s*ID\s*\|\s*([^|]+?)\s*\|/)
      if (m && m[1].trim() === id) return { type, spec, folder: join(dir, e.name), mdPath: p }
    }
  }
  return null
}

const doc = findDoc(identifier)
if (!doc) {
  console.error(`No proposal / request note / invoice found matching "${identifier}"`)
  process.exit(1)
}

const src = readFileSync(doc.mdPath, 'utf8')

// ─── Parse (safe surface only) ──────────────────────────────────────────────
function field(name) {
  const m = src.match(new RegExp(`\\|\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\|\\s*([^|]+?)\\s*\\|`))
  return m ? m[1].trim() : ''
}

function title() {
  return src.match(/^#\s+(.+)/m)?.[1]?.trim() ?? '(untitled)'
}

// Resolve the linked contact slug to a display name — the client's own name is
// safe; we never emit the slug or any other contact metadata.
function contactName() {
  const slug = field('Contact')
  if (!slug) return ''
  const cp = join(creamdeckDir, '_contacts', slug, 'CONTACT.md')
  if (existsSync(cp)) return readFileSync(cp, 'utf8').match(/^#\s+(.+)/m)?.[1]?.trim() ?? slug
  return slug
}

// Items: keep only the client columns. The Hash column (cell 6) is never read.
function items() {
  const lines = src.split('\n')
  const h = lines.findIndex(l => /^\|\s*#\s*\|/.test(l))
  if (h === -1) return []
  const out = []
  for (let i = h + 2; i < lines.length; i++) {
    const row = lines[i]
    if (!row.trim().startsWith('|')) break
    const cells = row.split('|').map(c => c.trim())
    cells.shift(); cells.pop()
    if (cells.length < 5) continue
    const [num, description, qty, unitPrice, total] = cells // cell 6 (hash) ignored
    out.push({ num, description, qty, unitPrice, total })
  }
  return out
}

const rows = items()
const currency = field('Currency') || ''
const grandTotal = rows.reduce((s, r) => s + (parseFloat(r.total) || 0), 0)
const anyPrice = rows.some(r => parseFloat(r.unitPrice) || parseFloat(r.total))

// ─── Inline markdown (bold only) for descriptions ───────────────────────────
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')
const money = v => { const n = parseFloat(v); return isNaN(n) ? esc(v || '—') : n.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

// ─── CSS (house style, matched to html.js) ──────────────────────────────────
const CSS = `
:root{--bg:#fafafa;--sur:#fff;--bdr:#e5e7eb;--tx:#111827;--mu:#6b7280;--ac:#2563eb;--wk:#fff7ed;--wkt:#c2410c}
@media(prefers-color-scheme:dark){:root{--bg:#111827;--sur:#1f2937;--bdr:#374151;--tx:#f9fafb;--mu:#9ca3af;--ac:#60a5fa;--wk:#431407;--wkt:#fdba74}}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--tx);font:15px/1.6 system-ui,sans-serif;padding:2.5rem 1rem}
.w{max-width:820px;margin:0 auto;background:var(--sur);border:1px solid var(--bdr);border-radius:.75rem;padding:2.5rem}
.kind{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--ac)}
h1{font-size:1.55rem;font-weight:700;margin:.35rem 0 1.5rem}
.meta{display:flex;flex-wrap:wrap;gap:.4rem 2rem;color:var(--mu);font-size:.9rem;margin-bottom:2rem}
.meta b{color:var(--tx);font-weight:600}
table{width:100%;border-collapse:collapse;font-size:.9rem;margin-bottom:1.5rem}
th{text-align:left;padding:.6rem .75rem;border-bottom:2px solid var(--bdr);color:var(--mu);font-weight:600}
th.n,td.n{text-align:right;white-space:nowrap}
td{padding:.6rem .75rem;border-bottom:1px solid var(--bdr);vertical-align:top}
tfoot td{border-bottom:none;border-top:2px solid var(--bdr);font-weight:700;font-size:1.05rem;padding-top:.9rem}
.issuer{color:var(--mu);font-size:.85rem;margin-bottom:2rem}
.foot{color:var(--mu);font-size:.75rem;margin-top:2rem;border-top:1px solid var(--bdr);padding-top:1rem}
`

// ─── Project (issuer) name ──────────────────────────────────────────────────
function projectName() {
  const p = join(creamdeckDir, 'CREAMDECK.md')
  if (!existsSync(p)) return ''
  const m = readFileSync(p, 'utf8').match(/^##\s+Project\s*\n+([\s\S]+?)(?=\n##|$)/)
  return m ? m[1].trim().split('\n')[0].trim() : ''
}

// ─── Render ─────────────────────────────────────────────────────────────────
const metaBits = doc.spec.fields
  .map(f => ({ f, v: field(f) }))
  .filter(x => x.v && x.v !== '—')
  .map(x => `<span><b>${L[x.f] || x.f}:</b> ${esc(x.v)}</span>`)
const cName = contactName()
if (cName) metaBits.unshift(`<span><b>${L.Contact}:</b> ${esc(cName)}</span>`)

const priceCols = anyPrice
  ? `<th class="n">${L.unit}</th><th class="n">${L.total}</th>`
  : ''
const bodyRows = rows.map(r => `<tr>
    <td class="n">${esc(r.num)}</td>
    <td>${inline(r.description)}</td>
    <td class="n">${esc(r.qty)}</td>
    ${anyPrice ? `<td class="n">${r.unitPrice && r.unitPrice !== '—' ? money(r.unitPrice) : '—'}</td><td class="n">${r.total && r.total !== '—' ? money(r.total) : '—'}</td>` : ''}
  </tr>`).join('')

const foot = anyPrice
  ? `<tfoot><tr><td colspan="4" class="n">${L.grand}</td><td class="n">${money(grandTotal)}${currency ? ' ' + esc(currency) : ''}</td></tr></tfoot>`
  : ''

const issuer = projectName()
const today = new Date().toISOString().slice(0, 10)

const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(field('ID') || title())} — ${esc(title())}</title>
<style>${CSS}</style>
</head>
<body><div class="w">
  ${issuer ? `<div class="issuer">${esc(issuer)}</div>` : ''}
  <div class="kind">${L[doc.type] || doc.type}</div>
  <h1>${esc(title())}</h1>
  <div class="meta">${metaBits.join('')}</div>
  <table>
    <thead><tr><th class="n">#</th><th>${L.desc}</th><th class="n">${L.qty}</th>${priceCols}</tr></thead>
    <tbody>${bodyRows}</tbody>
    ${foot}
  </table>
  <div class="foot">${L.generated} ${today}</div>
</div></body>
</html>`

const outPath = join(doc.folder, 'client-report.html')
writeFileSync(outPath, html, 'utf8')
console.log(`✓ client-report.html — ${doc.type} ${field('ID')} · ${rows.length} line(s)${anyPrice ? ` · total ${grandTotal.toFixed(2)} ${currency}` : ''}`)
console.log(`  client-safe projection: Hash column, ## Notes, ## Updates never read. Review before sending.`)
