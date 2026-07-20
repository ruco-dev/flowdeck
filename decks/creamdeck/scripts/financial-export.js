#!/usr/bin/env node
// creamdeck financial-export — from an INVOICE.md produce (1) a client-facing
// PROFORMA (HTML, non-fiscal) and (2) a provider import payload (JSON) for the
// financial platform chosen with --provider.
//
// Usage (from project root):
//   node .flowdeck/.creamdeck/_scripts/financial-export.js <invoice-id-or-folder> \
//        [--provider moloni] [--vat 23] [--lang pt-PT]
//
// The platform is an OPTION, never hardcoded into the flow. Providers live in
// the PROVIDERS registry below — add an entry (label, file, build) to support a
// new one. Moloni is the only entry available today; it is the default.
//
// Outputs (both replaced on every run), next to INVOICE.md:
//   invoice-proforma.html   — provider-agnostic; subtotal + VAT + total; watermarked "not a fiscal invoice"
//   invoice-<provider>.json — the chosen provider's import payload
//
// LEGAL NOTE: a certified fiscal invoice must be issued *by* the provider
// (in PT, SAF-T / AT). This script never emits a fiscal document — the proforma
// is a preview and the JSON is the input that creates the real invoice in the
// provider. No API call is made here.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const creamdeckDir = join(__dirname, '..')
const invoicesDir = join(creamdeckDir, 'invoices')

// ─── Provider registry ──────────────────────────────────────────────────────
// Each provider: { label, file, requires[], build(inv) }. `requires` lists the
// account-specific IDs a human must resolve before POSTing (they cannot be
// derived from a card); `build` maps the normalized invoice to the provider's
// API shape. Add a provider here — nothing else in the flow is provider-aware.
const PROVIDERS = {
  moloni: {
    label: 'Moloni',
    file: 'invoice-moloni.json',
    requires: ['company_id', 'customer_id', 'document_set_id', 'tax_id'],
    build: (inv) => ({
      _endpoint: 'documents/invoices/insert',   // verify against current Moloni API before use
      _requires: {
        note: 'Account-specific IDs — resolve from your Moloni account before POSTing.',
        company_id: null,
        customer_id: null,        // resolve from Moloni customers, matching this card's Contact
        document_set_id: null,    // the invoice series/set in Moloni
        tax_id: null,             // the Moloni tax id for this VAT rate
        product_ids: null,        // per line, if you keep a Moloni product catalogue; else use free-text `name`
      },
      company_id: null,
      customer_id: null,
      document_set_id: null,
      date: inv.date,
      expiration_date: inv.dueDate,
      your_reference: inv.id,
      financial_discount: 0,
      special_discount: 0,
      products: inv.items.map((it, idx) => ({
        product_id: null,
        name: it.description,
        qty: it.qty,
        price: it.unitPrice,      // net unit price
        discount: 0,
        order: idx + 1,
        taxes: [{ tax_id: null, value: inv.vatRate, order: 1, cumulative: 0 }],
        exemption_reason: '',     // required by Moloni only when a line carries no tax
      })),
      _totals: { subtotal: inv.subtotal, vat: inv.vat, vat_rate: inv.vatRate, total: inv.total, currency: inv.currency },
    }),
  },
  // Add another platform here, e.g. `invoicexpress: { label, file, requires, build }`.
}

// ─── Args ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const flag = (name, def) => { const i = argv.indexOf(name); return i !== -1 ? argv[i + 1] : def }
const lang = flag('--lang', 'en')
const vatRate = parseFloat(flag('--vat', '23'))
const providerName = flag('--provider', 'moloni')
const identifier = argv.find((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'))

if (!identifier) {
  console.error('Usage: financial-export.js <invoice-id-or-folder> [--provider <name>] [--vat 23] [--lang pt-PT]')
  console.error(`Providers: ${Object.keys(PROVIDERS).join(', ')}`)
  process.exit(1)
}
const provider = PROVIDERS[providerName]
if (!provider) {
  console.error(`Unknown provider "${providerName}". Available: ${Object.keys(PROVIDERS).join(', ')}`)
  process.exit(1)
}

const LABELS = {
  en:      { proforma: 'Proforma', notFiscal: 'Not a fiscal invoice — for preview only. The fiscal invoice is issued by the provider.', ref: 'Ref.', date: 'Date', due: 'Due date', to: 'For', desc: 'Description', qty: 'Qty', unit: 'Unit price', net: 'Net', subtotal: 'Subtotal', vat: 'VAT', total: 'Total', generated: 'Generated' },
  'pt-PT': { proforma: 'Proforma', notFiscal: 'Documento sem valor fiscal — apenas para pré-visualização. A fatura fiscal é emitida pelo fornecedor.', ref: 'Ref.', date: 'Data', due: 'Vencimento', to: 'Para', desc: 'Descrição', qty: 'Qt.', unit: 'Preço unit.', net: 'Líquido', subtotal: 'Subtotal', vat: 'IVA', total: 'Total', generated: 'Gerado em' },
}
const L = LABELS[lang] || LABELS.en

// ─── Locate invoice ─────────────────────────────────────────────────────────
function findInvoiceDir(id) {
  const direct = join(invoicesDir, id)
  if (existsSync(join(direct, 'INVOICE.md'))) return direct
  for (const e of readdirSync(invoicesDir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue
    const p = join(invoicesDir, e.name, 'INVOICE.md')
    if (!existsSync(p)) continue
    const m = readFileSync(p, 'utf8').match(/\|\s*ID\s*\|\s*([^|]+?)\s*\|/)
    if (m && m[1].trim() === id) return join(invoicesDir, e.name)
  }
  return null
}

const invoiceDir = findInvoiceDir(identifier)
if (!invoiceDir) {
  console.error(`No invoice found matching "${identifier}" under ${invoicesDir}`)
  process.exit(1)
}
const src = readFileSync(join(invoiceDir, 'INVOICE.md'), 'utf8')

// ─── Parse + normalize ──────────────────────────────────────────────────────
// The — placeholder means "unset" in every template; coerce it to null.
const orNull = v => (v && v !== '—') ? v : null
function field(name) {
  const m = src.match(new RegExp(`\\|\\s*${name}\\s*\\|\\s*([^|]+?)\\s*\\|`))
  return m ? m[1].trim() : ''
}
function title() { return src.match(/^#\s+(.+)/m)?.[1]?.trim() ?? '(untitled)' }
function contactName(slug) {
  if (!slug) return ''
  const cp = join(creamdeckDir, '_contacts', slug, 'CONTACT.md')
  if (existsSync(cp)) return readFileSync(cp, 'utf8').match(/^#\s+(.+)/m)?.[1]?.trim() ?? slug
  return slug
}

const lines = src.split('\n')
const h = lines.findIndex(l => /^\|\s*#\s*\|/.test(l))
const items = []
if (h !== -1) {
  for (let i = h + 2; i < lines.length; i++) {
    const row = lines[i]
    if (!row.trim().startsWith('|')) break
    const cells = row.split('|').map(c => c.trim()); cells.shift(); cells.pop()
    if (cells.length < 5) continue
    const [num, description, qty, unitPrice, total] = cells
    items.push({ num, description, qty: parseFloat(qty) || 0, unitPrice: parseFloat(unitPrice) || 0, net: parseFloat(total) || 0 })
  }
}

const subtotal = items.reduce((s, i) => s + i.net, 0)
const vat = +(subtotal * vatRate / 100).toFixed(2)
const total = +(subtotal + vat).toFixed(2)
const currency = field('Currency') || 'EUR'
const contactSlug = field('Contact')

const inv = {
  id: orNull(field('ID')),
  date: orNull(field('Date')),
  dueDate: orNull(field('Due Date')),
  currency,
  contactSlug,
  contactName: contactName(contactSlug),
  title: title(),
  items,
  subtotal, vat, vatRate, total,
}

// ─── (1) Provider import payload ────────────────────────────────────────────
writeFileSync(join(invoiceDir, provider.file), JSON.stringify(provider.build(inv), null, 2) + '\n', 'utf8')

// ─── (2) Proforma HTML (provider-agnostic) ──────────────────────────────────
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
const money = n => n.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const CSS = `
:root{--bg:#fafafa;--sur:#fff;--bdr:#e5e7eb;--tx:#111827;--mu:#6b7280;--ac:#2563eb;--wk:#fff7ed;--wkt:#c2410c}
@media(prefers-color-scheme:dark){:root{--bg:#111827;--sur:#1f2937;--bdr:#374151;--tx:#f9fafb;--mu:#9ca3af;--ac:#60a5fa;--wk:#431407;--wkt:#fdba74}}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--tx);font:15px/1.6 system-ui,sans-serif;padding:2.5rem 1rem}
.w{max-width:820px;margin:0 auto;background:var(--sur);border:1px solid var(--bdr);border-radius:.75rem;padding:2.5rem}
.stamp{display:inline-block;background:var(--wk);color:var(--wkt);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;padding:.3rem .7rem;border-radius:.4rem;margin-bottom:1rem}
.kind{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--ac)}
h1{font-size:1.55rem;font-weight:700;margin:.35rem 0 1.5rem}
.meta{display:flex;flex-wrap:wrap;gap:.4rem 2rem;color:var(--mu);font-size:.9rem;margin-bottom:2rem}
.meta b{color:var(--tx);font-weight:600}
table{width:100%;border-collapse:collapse;font-size:.9rem;margin-bottom:1.5rem}
th{text-align:left;padding:.6rem .75rem;border-bottom:2px solid var(--bdr);color:var(--mu);font-weight:600}
th.n,td.n{text-align:right;white-space:nowrap}
td{padding:.6rem .75rem;border-bottom:1px solid var(--bdr);vertical-align:top}
tfoot td{border-bottom:none}
tfoot tr.grand td{border-top:2px solid var(--bdr);font-weight:700;font-size:1.05rem;padding-top:.9rem}
.foot{color:var(--mu);font-size:.75rem;margin-top:2rem;border-top:1px solid var(--bdr);padding-top:1rem}
`
const metaBits = [
  inv.id && `<span><b>${L.ref}:</b> ${esc(inv.id)}</span>`,
  inv.contactName && `<span><b>${L.to}:</b> ${esc(inv.contactName)}</span>`,
  inv.date && `<span><b>${L.date}:</b> ${esc(inv.date)}</span>`,
  inv.dueDate && `<span><b>${L.due}:</b> ${esc(inv.dueDate)}</span>`,
].filter(Boolean).join('')

const bodyRows = items.map(it => `<tr>
    <td class="n">${esc(it.num)}</td>
    <td>${inline(it.description)}</td>
    <td class="n">${it.qty}</td>
    <td class="n">${money(it.unitPrice)}</td>
    <td class="n">${money(it.net)}</td>
  </tr>`).join('')

const proforma = `<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(inv.id)} — ${L.proforma}</title><style>${CSS}</style></head>
<body><div class="w">
  <div class="stamp">${L.proforma} · ${L.notFiscal}</div>
  <div class="kind">${L.proforma}</div>
  <h1>${esc(inv.title)}</h1>
  <div class="meta">${metaBits}</div>
  <table>
    <thead><tr><th class="n">#</th><th>${L.desc}</th><th class="n">${L.qty}</th><th class="n">${L.unit}</th><th class="n">${L.net}</th></tr></thead>
    <tbody>${bodyRows}</tbody>
    <tfoot>
      <tr><td colspan="4" class="n">${L.subtotal}</td><td class="n">${money(subtotal)} ${esc(currency)}</td></tr>
      <tr><td colspan="4" class="n">${L.vat} ${vatRate}%</td><td class="n">${money(vat)} ${esc(currency)}</td></tr>
      <tr class="grand"><td colspan="4" class="n">${L.total}</td><td class="n">${money(total)} ${esc(currency)}</td></tr>
    </tfoot>
  </table>
  <div class="foot">${L.generated} ${new Date().toISOString().slice(0, 10)}</div>
</div></body></html>`
writeFileSync(join(invoiceDir, 'invoice-proforma.html'), proforma, 'utf8')

console.log(`✓ ${inv.id} — ${items.length} line(s) · subtotal ${money(subtotal)} + ${L.vat} ${vatRate}% ${money(vat)} = ${money(total)} ${currency}`)
console.log(`  provider: ${provider.label} → ${provider.file} (fill _requires: ${provider.requires.join(', ')} before POST) + invoice-proforma.html (non-fiscal preview)`)
