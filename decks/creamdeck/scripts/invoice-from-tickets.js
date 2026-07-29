#!/usr/bin/env node
// creamdeck invoice-from-tickets — mint an invoice from billable tickets.
// Usage (from project root):
//   node .flowdeck/.creamdeck/_scripts/invoice-from-tickets.js [options]
//
// Deterministic half of the `create-invoice-from-tickets` action: it selects the
// billable tickets, prices them against CREAMDECK.md's `## Services` table, mints
// the invoice ID, scaffolds invoices/<id>/, annotates each billed TICKET.md with the
// invoice number and moves it to billed-tickets/. The client-facing line description
// is judgment, not arithmetic — the agent supplies it with --description.
//
// Options:
//   --stage <name>        ticket Stage to bill (default: Resolved)
//   --tickets <a,b,c>     explicit ticket IDs or folder slugs (overrides --stage)
//   --group unit|ticket   one line per unit+rate (default) or one line per ticket
//   --description <text>  client-facing summary appended to each grouped line;
//                         repeatable, and `<Unit>=<text>` scopes it to one unit
//   --title <text>        invoice title (default: "Invoice <id>")
//   --date YYYY-MM-DD     issue date (default: today)
//   --due-days <n>        days until Due Date (default: 30)
//   --contact <email>     override the contact (default: the one the tickets share)
//   --dry-run             print the selection + totals as JSON, write nothing
//   --no-move             leave billed tickets in tickets/
//   --no-annotate         don't write the Invoice field into TICKET.md
//
// Billing kinds — a ticket declares one in its `Billing Kind` field (default: hours):
//   hours  qty = Billing Qty ?? Hours Real,  unit Hour, rate from Services
//   fee    qty = Billing Qty ?? 1,           unit Fee,  rate from Services or Billing Rate
//   sale   qty = Billing Qty ?? 1,           unit Item, rate from Billing Rate or Services
//   adhoc  qty 1,                            unit —,    price = Billing Amount (required)
// Any kind may override the unit (`Billing Unit`, matched against the Services table)
// or the price (`Billing Rate`). A ticket that already carries an `Invoice` value is
// skipped — a ticket is billed once.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, renameSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const creamdeckDir = join(__dirname, '..')
const flowdeckDir = join(creamdeckDir, '..')
const ticketsDir = join(creamdeckDir, 'tickets')
const billedDir = join(creamdeckDir, 'billed-tickets')
const invoicesDir = join(creamdeckDir, 'invoices')
const templatePath = join(flowdeckDir, '_energy-cards', 'INVOICE.md.template')

// ---------- args ----------

const argv = process.argv.slice(2)
const opts = { stage: 'Resolved', group: 'unit', dueDays: 30, move: true, annotate: true }
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  const next = () => argv[++i]
  if (a === '--stage') opts.stage = next()
  else if (a === '--tickets') opts.tickets = next().split(',').map((s) => s.trim()).filter(Boolean)
  else if (a === '--group') opts.group = next()
  else if (a === '--description') (opts.descriptions ??= []).push(next())
  else if (a === '--title') opts.title = next()
  else if (a === '--date') opts.date = next()
  else if (a === '--due-days') opts.dueDays = parseInt(next(), 10)
  else if (a === '--contact') opts.contact = next()
  else if (a === '--dry-run') opts.dryRun = true
  else if (a === '--no-move') opts.move = false
  else if (a === '--no-annotate') opts.annotate = false
  else {
    console.error(`Unknown option: ${a}`)
    process.exit(1)
  }
}
if (!['unit', 'ticket'].includes(opts.group)) {
  console.error(`--group must be "unit" or "ticket" (got "${opts.group}")`)
  process.exit(1)
}

const issueDate = opts.date || new Date().toISOString().slice(0, 10)
const dueDate = (() => {
  const d = new Date(`${issueDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + opts.dueDays)
  return d.toISOString().slice(0, 10)
})()

const fail = (msg) => {
  console.error(msg)
  process.exit(1)
}

// ---------- markdown field-table helpers ----------

// Every creamdeck document opens with a `| Field | Value |` table; read one cell.
function field(src, name) {
  const m = src.match(new RegExp(`^\\|\\s*${name}\\s*\\|\\s*([^|]*?)\\s*\\|`, 'm'))
  const v = m ? m[1].trim() : ''
  return v === '—' || v === '' ? null : v
}

const num = (v) => {
  if (v == null) return null
  const m = String(v).replace(',', '.').match(/-?\d+(\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

const money = (n) => n.toFixed(2)

// ---------- CREAMDECK.md: prefix + services ----------

const creamdeckMd = readFileSync(join(creamdeckDir, 'CREAMDECK.md'), 'utf8')
const prefix = (field(creamdeckMd, 'Prefix') || '').replace(/`/g, '') || fail('No Prefix row in CREAMDECK.md → ## Document IDs')

function parseServices(src) {
  const lines = src.split('\n')
  const start = lines.findIndex((l) => /^##\s+Services\s*$/.test(l))
  if (start === -1) fail('No ## Services table in CREAMDECK.md')
  const rows = []
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i]
    if (/^##\s/.test(l)) break
    if (!l.trim().startsWith('|')) continue
    const cells = l.split('|').slice(1, -1).map((c) => c.trim())
    if (cells.length < 4) continue
    if (/^-+:?$|^:?-+/.test(cells[0])) continue
    if (/^description$/i.test(cells[0])) continue
    rows.push({
      description: cells[0],
      unit: cells[1],
      rate: num(cells[2]),
      currency: cells[3] || '€',
      vat: cells[4] || '',
    })
  }
  if (!rows.length) fail('## Services table in CREAMDECK.md has no rows — add at least one service line')
  return rows
}

const services = parseServices(creamdeckMd)
const serviceFor = (unit) => services.find((s) => s.unit.toLowerCase() === String(unit || '').toLowerCase())
const currency = services[0].currency

// `--description "Hour=text"` scopes the wording to one unit; a bare text applies to all
const descriptions = (opts.descriptions || []).map((raw) => {
  const m = raw.match(/^([^=]{1,24})=([^]*)$/)
  return m && serviceFor(m[1].trim()) ? { unit: m[1].trim(), text: m[2].trim() } : { unit: null, text: raw }
})

// ---------- billing kinds ----------

const KINDS = {
  hours: { defaultUnit: 'Hour', qty: (t) => num(t.get('Billing Qty')) ?? num(t.get('Hours Real')) },
  fee: { defaultUnit: 'Fee', qty: (t) => num(t.get('Billing Qty')) ?? 1 },
  sale: { defaultUnit: 'Item', qty: (t) => num(t.get('Billing Qty')) ?? 1 },
  // an ad hoc charge is its own thing — never merged with another ticket's
  adhoc: { defaultUnit: '—', qty: () => 1, price: (t) => num(t.get('Billing Amount')), groupable: false },
}

// ---------- ticket selection ----------

if (!existsSync(ticketsDir)) fail(`No tickets folder at ${ticketsDir}`)

const ticketFolders = readdirSync(ticketsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(ticketsDir, e.name, 'TICKET.md')))
  .map((e) => e.name)
  .sort()

const skipped = []
const selected = []

for (const slug of ticketFolders) {
  const path = join(ticketsDir, slug, 'TICKET.md')
  const src = readFileSync(path, 'utf8')
  const get = (name) => field(src, name)
  const t = {
    slug,
    path,
    src,
    get,
    id: get('ID') || slug,
    title: (src.match(/^#\s+(.+)$/m) || [, slug])[1].trim(),
    stage: get('Stage') || '',
    contact: get('Contact'),
    invoice: get('Invoice'),
  }
  t.get = (name) => field(t.src, name)

  const wanted = opts.tickets
    ? opts.tickets.includes(t.id) || opts.tickets.includes(slug)
    : t.stage.toLowerCase() === opts.stage.toLowerCase()
  if (!wanted) continue
  if (t.invoice) {
    skipped.push({ id: t.id, slug, reason: `already billed on ${t.invoice}` })
    continue
  }

  const kindName = (t.get('Billing Kind') || 'hours').toLowerCase()
  const kind = KINDS[kindName]
  if (!kind) {
    skipped.push({ id: t.id, slug, reason: `unknown Billing Kind "${kindName}" (known: ${Object.keys(KINDS).join(', ')})` })
    continue
  }
  const unit = t.get('Billing Unit') || kind.defaultUnit
  const service = serviceFor(unit)
  const qty = kind.qty(t)
  const price = num(t.get('Billing Rate')) ?? (kind.price ? kind.price(t) : null) ?? service?.rate ?? null

  if (qty == null) {
    skipped.push({ id: t.id, slug, reason: `no quantity — set Billing Qty${kindName === 'hours' ? ' or Hours Real' : ''}` })
    continue
  }
  if (price == null) {
    skipped.push({ id: t.id, slug, reason: `no price — set Billing Rate${kindName === 'adhoc' ? ' or Billing Amount' : ''}, or add a "${unit}" row to CREAMDECK.md → ## Services` })
    continue
  }

  selected.push({ ...t, kind: kindName, unit, qty, price, total: qty * price, service, groupable: kind.groupable !== false })
}

if (!selected.length) {
  console.error(
    `No billable tickets found (${opts.tickets ? `--tickets ${opts.tickets.join(',')}` : `Stage: ${opts.stage}`}).` +
      (skipped.length ? `\nSkipped:\n${skipped.map((s) => `  - ${s.id} — ${s.reason}`).join('\n')}` : '')
  )
  process.exit(1)
}

const contacts = [...new Set(selected.map((t) => t.contact).filter(Boolean))]
const contact = opts.contact || (contacts.length === 1 ? contacts[0] : null)
if (!contact) {
  fail(
    contacts.length
      ? `Selected tickets span ${contacts.length} contacts (${contacts.join(', ')}) — bill them separately or pass --contact`
      : 'No Contact on the selected tickets — pass --contact'
  )
}

// ---------- lines ----------

const lines =
  opts.group === 'ticket'
    ? selected.map((t) => ({
        description: t.title,
        qty: t.qty,
        price: t.price,
        total: t.total,
        tickets: [t],
      }))
    : Object.values(
        selected.reduce((acc, t) => {
          const key = t.groupable ? `${t.unit}|${t.price}` : `ticket:${t.id}`
          acc[key] ??= { unit: t.unit, service: t.service, qty: 0, price: t.price, total: 0, tickets: [] }
          acc[key].qty += t.qty
          acc[key].total += t.total
          acc[key].tickets.push(t)
          return acc
        }, {})
      ).map((l) => ({
        // a grouped line is named by its service; an ungrouped one by its ticket
        description: l.service?.description || (l.tickets.length === 1 ? l.tickets[0].title : `${l.unit} × ${l.tickets.length}`),
        ...l,
      }))

// --description carries the client-facing wording the agent wrote; `<Unit>=text`
// scopes it to one line when the invoice mixes units.
if (opts.group === 'unit') {
  for (const l of lines) {
    const scoped = descriptions.find((d) => d.unit && d.unit.toLowerCase() === String(l.unit).toLowerCase())
    // a bare description qualifies a service line; a ticket-named line already says what it is
    const all = l.service ? descriptions.find((d) => !d.unit) : null
    const text = (scoped || all)?.text
    if (text) l.description = `${l.description} — ${text}`
  }
}

const subtotal = lines.reduce((s, l) => s + l.total, 0)

// ---------- invoice ID ----------

if (!existsSync(invoicesDir)) mkdirSync(invoicesDir, { recursive: true })
const [y, m, d] = issueDate.split('-')
const idStem = `${prefix}I${d}${m}${y}`
const seq = String(
  readdirSync(invoicesDir, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name.startsWith(idStem)).length + 1
).padStart(3, '0')
const invoiceId = `${idStem}${seq}`
const title = opts.title || `Invoice ${invoiceId}`

// ---------- dry run ----------

if (opts.dryRun) {
  console.log(
    JSON.stringify(
      {
        invoiceId,
        date: issueDate,
        dueDate,
        contact,
        currency,
        vat: services[0].vat,
        tickets: selected.map((t) => ({ id: t.id, slug: t.slug, title: t.title, kind: t.kind, unit: t.unit, qty: t.qty, price: t.price, total: t.total })),
        lines: lines.map((l) => ({ description: l.description, qty: l.qty, unitPrice: l.price, total: l.total, tickets: l.tickets.map((t) => t.id) })),
        subtotal,
        skipped,
      },
      null,
      2
    )
  )
  process.exit(0)
}

// ---------- write the invoice ----------

const invoiceDir = join(invoicesDir, invoiceId)
mkdirSync(invoiceDir, { recursive: true })

const itemRows = lines
  .map((l, i) => `| ${i + 1} | ${l.description} | ${l.qty} | ${money(l.price)} | ${money(l.total)} | — |`)
  .join('\n')

const notes = [
  `| Ticket | Title | Kind | Qty | Unit | Total |`,
  `|--------|-------|------|-----|------|-------|`,
  ...selected.map((t) => `| ${t.id} | ${t.title} | ${t.kind} | ${t.qty} | ${t.unit} | ${money(t.total)} |`),
  '',
  `Billed from ${selected.length} ticket(s) — subtotal ${money(subtotal)} ${currency}.`,
  `Line values are net; VAT ${services[0].vat || '—'} is applied on export (financial-export --vat).`,
  `No proposal or request note attached — ad hoc lines, Hash \`—\`.`,
  ...(skipped.length ? ['', `Skipped: ${skipped.map((s) => `${s.id} (${s.reason})`).join('; ')}`] : []),
].join('\n')

const invoiceMd = readFileSync(templatePath, 'utf8')
  .replace('{{INVOICE_TITLE}}', title)
  .replace('{{INVOICE_ID}}', invoiceId)
  .replace('{{PROPOSAL_ID}}', '—')
  .replace('{{REQUEST_NOTE_ID}}', '—')
  .replace('{{CONTACT}}', contact)
  .replace('{{STATUS}}', 'Draft')
  .replace('{{DATE}}', issueDate)
  .replace('{{DUE_DATE}}', dueDate)
  .replace('{{CURRENCY}}', currency)
  .replace(/^(\|\s*#\s*\|.*\n\|[-| ]+\|)[ \t]*$/m, `$1\n${itemRows}`)
  .replace('{{NOTES}}', notes)

writeFileSync(join(invoiceDir, 'INVOICE.md'), invoiceMd, 'utf8')

const invoiceTodo = `# ${invoiceId}

## BOT

## HUMAN

- [ ] Review \`INVOICE.md\` (items, quantities, client-facing description) before advancing Status.

## ACTIONS

<!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

- [ ] mark-issued — run \`node .flowdeck/.creamdeck/_scripts/export-invoice.js ${invoiceId}\` from the project root, then set Status to Issued in \`INVOICE.md\`
- [ ] mark-paid — set Status to Paid and fill the \`Paid\` date in \`INVOICE.md\`; then play \`billed-tickets/TODO.md\` → \`settle-tickets\` to close this invoice's tickets
- [ ] void — set Status to Cancelled in \`INVOICE.md\`; then play \`billed-tickets/TODO.md\` → \`unbill\` to return its tickets to \`tickets/\`
- [ ] client-report — render a client-safe statement; full definition in \`../../ACTIONS.md\`
- [ ] financial-export — proforma + provider payload; full definition in \`../../ACTIONS.md\`
- [ ] draft-email — compose a cover email from this invoice; full definition in \`../../ACTIONS.md\`
`
writeFileSync(join(invoiceDir, 'TODO.md'), invoiceTodo, 'utf8')

// ---------- annotate + move the billed tickets ----------

function annotate(t) {
  let src = t.src
  if (/^\|\s*Invoice\s*\|/m.test(src)) {
    src = src.replace(/^\|\s*Invoice\s*\|[^|]*\|.*$/m, `| Invoice | ${invoiceId} |`)
  } else {
    // append to the header field table — the first blank line after its last row
    src = src.replace(/^(\|[^\n]*\|\n)(?!\|)/m, `$1| Invoice | ${invoiceId} |\n`)
  }
  const updateLine = `**${issueDate}** · Billed on invoice ${invoiceId} — ${money(t.total)} ${currency}`
  // most recent first — slot the line directly under the heading (and its hint comment)
  if (/^##\s+Updates[ \t]*$/m.test(src)) {
    src = src.replace(/^(##\s+Updates[ \t]*\n)((?:[ \t]*\n)*(?:<!--[^]*?-->\n)?)/m, `$1$2${updateLine}\n`)
  }
  writeFileSync(t.path, src, 'utf8')
}

function move(t) {
  const dest = join(billedDir, t.slug)
  try {
    execFileSync('git', ['mv', join(ticketsDir, t.slug), dest], { cwd: join(creamdeckDir, '..', '..'), stdio: 'pipe' })
  } catch {
    renameSync(join(ticketsDir, t.slug), dest)
  }
  t.path = join(dest, 'TICKET.md')
}

if (opts.move && !existsSync(billedDir)) mkdirSync(billedDir, { recursive: true })

for (const t of selected) {
  if (opts.annotate) annotate(t)
  if (opts.move) move(t)
}

// ---------- report ----------

console.log(
  [
    `${invoiceId} — ${lines.length} line(s), ${selected.length} ticket(s), subtotal ${money(subtotal)} ${currency} (net), Status Draft`,
    `  invoice: .flowdeck/.creamdeck/invoices/${invoiceId}/INVOICE.md`,
    ...lines.map((l) => `  line: ${l.qty} × ${money(l.price)} = ${money(l.total)} — ${l.description.slice(0, 60)}`),
    `  tickets: ${selected.map((t) => t.id).join(', ')}${opts.move ? ' → billed-tickets/' : ''}`,
    ...(skipped.length ? [`  skipped: ${skipped.map((s) => `${s.id} (${s.reason})`).join('; ')}`] : []),
  ].join('\n')
)
