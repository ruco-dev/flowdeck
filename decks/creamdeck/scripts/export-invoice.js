#!/usr/bin/env node
// creamdeck export-invoice — write invoice-export.json from INVOICE.md.
// Usage (from project root):
//   node .flowdeck/.creamdeck/_scripts/export-invoice.js <invoice-id-or-folder>
// Reads invoices/<folder>/INVOICE.md and writes invoices/<folder>/invoice-export.json —
// a provider-agnostic line-item export, ready to map onto a financial app's document
// fields (e.g. Moloni) when that integration is built. No API call is made here.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const creamdeckDir = join(__dirname, '..')
const invoicesDir = join(creamdeckDir, 'invoices')

const identifier = process.argv[2]
if (!identifier) {
  console.error('Usage: export-invoice.js <invoice-id-or-folder>')
  process.exit(1)
}

function findInvoiceDir(id) {
  const direct = join(invoicesDir, id)
  if (existsSync(join(direct, 'INVOICE.md'))) return direct
  const dirs = readdirSync(invoicesDir, { withFileTypes: true }).filter((e) => e.isDirectory())
  for (const e of dirs) {
    const p = join(invoicesDir, e.name, 'INVOICE.md')
    if (!existsSync(p)) continue
    const src = readFileSync(p, 'utf8')
    const m = src.match(/\|\s*ID\s*\|\s*([^|]+?)\s*\|/)
    if (m && m[1].trim() === id) return join(invoicesDir, e.name)
  }
  return null
}

const invoiceDir = findInvoiceDir(identifier)
if (!invoiceDir) {
  console.error(`No invoice found matching "${identifier}" under ${invoicesDir}`)
  process.exit(1)
}

const mdPath = join(invoiceDir, 'INVOICE.md')
const src = readFileSync(mdPath, 'utf8')

function field(name) {
  const m = src.match(new RegExp(`\\|\\s*${name}\\s*\\|\\s*([^|]+?)\\s*\\|`))
  return m ? m[1].trim() : ''
}

const lines = src.split('\n')
const headerIdx = lines.findIndex((l) => /^\|\s*#\s*\|/.test(l))
const items = []
if (headerIdx !== -1) {
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const row = lines[i]
    if (!row.trim().startsWith('|')) break
    const cells = row.split('|').map((c) => c.trim())
    cells.shift()
    cells.pop()
    if (cells.length < 6) continue
    const [, description, qty, unitPrice, total, hash] = cells
    items.push({
      description,
      quantity: parseFloat(qty) || 0,
      unitPrice: parseFloat(unitPrice) || 0,
      total: parseFloat(total) || 0,
      hash: hash === '—' ? null : hash,
    })
  }
}

const subtotal = items.reduce((sum, i) => sum + i.total, 0)
const invoiceId = field('ID')

const doc = {
  id: invoiceId,
  status: field('Status'),
  issueDate: field('Date'),
  dueDate: field('Due Date'),
  currency: field('Currency'),
  contact: field('Contact'),
  proposalId: field('Proposal') || null,
  requestNoteId: field('Request Note') || null,
  lines: items,
  totals: { subtotal, tax: 0, total: subtotal },
  _integration: "generic — map to your financial provider's document/line fields when connecting (e.g. Moloni)",
}

const jsonPath = join(invoiceDir, 'invoice-export.json')
writeFileSync(jsonPath, JSON.stringify(doc, null, 2) + '\n', 'utf8')
console.log(`invoice-export.json written — ${invoiceId}, ${items.length} line(s), subtotal ${subtotal}`)
