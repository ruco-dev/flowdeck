// seodeck sitemap diff — zero-dependency (node: builtins + global fetch).
//
// Routine 2 of the sitemap family: compare the sitemap URL set against the GSC
// "Top internally linked pages" export and report inconsistencies in both directions.
//
// Usage:
//   node seodeck_sitemap_diff.js --sitemap <origin | sitemap-urls.csv>
//                                --gsc <internal-links.csv>
//                               [--out <report.md>]
//                               [--gsc-property <site>]
//
// --sitemap  An origin (https://example.com) to enumerate live via robots.txt /
//            sitemap index walk, OR a CSV produced by `site_checks sitemap --out`
//            (routine 1's sitemap-urls.csv). Anything starting with http(s):// is
//            treated as a live origin; otherwise treated as a file path.
// --gsc      The GSC "Top internally linked pages" CSV (Links → Internal links →
//            Top linked pages). Columns: "Target page, Internal links".
//            Auto-detected: uses the "Target page" column if found, else col 0.
// --out      Markdown report path. Default: <gsc-basename>-sitemap-diff.md.
// --gsc-property  Optional: a GSC property slug (e.g. sc-domain:example.com).
//            When given, runs seodeck_gsc.js querypages and adds a third section
//            listing pages with GSC impressions absent from the sitemap — high-
//            confidence sitemap gaps (Google already ranks them but you don't
//            advertise them).

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import { spawnSync } from 'node:child_process'

const UA = 'seodeck-sitemap-diff/0.1 (+https://github.com/ruco-dev/flowdeck)'
const TIMEOUT = 20_000

// ── Args ─────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)

function flag(name, fallback = null) {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}

function usage(msg) {
  if (msg) console.error(`Error: ${msg}\n`)
  console.error('Usage:')
  console.error('  seodeck_sitemap_diff.js --sitemap <origin | sitemap-urls.csv>')
  console.error('                          --gsc <internal-links.csv>')
  console.error('                         [--out <report.md>]')
  console.error('                         [--gsc-property <site>]')
  process.exit(msg ? 1 : 0)
}

if (argv.includes('--help') || argv.includes('-h')) usage()

const sitemapArg = flag('sitemap')
const gscPath = flag('gsc')
if (!sitemapArg) usage('--sitemap <origin | sitemap-urls.csv> is required.')
if (!gscPath) usage('--gsc <internal-links.csv> is required.')

const outPath = flag('out', gscPath.replace(/\.csv$/i, '') + '-sitemap-diff.md')
const gscProperty = flag('gsc-property')

// Origin: anything starting with http:// or https://.
const isOrigin = /^https?:\/\//i.test(sitemapArg)

// ── URL normalization ─────────────────────────────────────────────────────────
//
// Canonical form: lowercase scheme+host (URL class does this), no fragment,
// no trailing slash on non-root paths. Percent-encoding is canonicalized by
// the URL parser. URLs with query strings are flagged separately.

function normalizeUrl(raw) {
  if (typeof raw !== 'string') return null
  let s = raw.trim()
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s
  let u
  try { u = new URL(s) } catch { return null }
  u.hash = ''
  if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
    u.pathname = u.pathname.slice(0, -1)
  }
  return u.toString()
}

function hasQueryString(url) {
  try { return new URL(url).search !== '' } catch { return false }
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function splitCsvLine(line) {
  const out = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') inQ = false
      else cur += c
    } else if (c === '"') inQ = true
    else if (c === ',') { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map(s => s.trim())
}

// Reads URLs from a CSV. Header auto-detect: prefers a "url", "target page",
// or "page" column; falls back to column 0. Normalizes every URL before dedup.
function readUrlsFromCsv(filePath) {
  const raw = readFileSync(filePath, 'utf8')
  const rows = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  if (rows.length === 0) return []

  const first = splitCsvLine(rows[0])
  const urlColPatterns = [/^url$/i, /^target\s*page$/i, /^page$/i]
  let urlCol = first.findIndex(c => urlColPatterns.some(re => re.test(c)))
  let start
  if (urlCol >= 0) {
    start = 1
  } else if (!/(:\/\/|\.[a-z]{2,})/i.test(first[0] || '')) {
    urlCol = 0; start = 1  // non-URL first cell → treat as header
  } else {
    urlCol = 0; start = 0
  }

  const urls = []
  const seen = new Set()
  for (let r = start; r < rows.length; r++) {
    const cells = splitCsvLine(rows[r])
    const raw = (cells[urlCol] ?? cells[0] ?? '').replace(/^["']|["']$/g, '').trim()
    const n = normalizeUrl(raw)
    if (!n || seen.has(n)) continue
    seen.add(n)
    urls.push(n)
  }
  return urls
}

// ── Live sitemap enumeration ──────────────────────────────────────────────────
// Same robots.txt → sitemap index → urlsets walk as site_checks sitemap.

async function enumerateSitemap(origin) {
  const roots = []
  try {
    const robots = await (await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { 'User-Agent': UA },
    })).text()
    for (const m of robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)) roots.push(m[1])
  } catch { /* no robots.txt or network error */ }
  if (roots.length === 0) roots.push(`${origin}/sitemap.xml`)

  const seen = new Set(), urls = new Set(), errors = []
  const queue = [...roots]
  while (queue.length) {
    const sm = queue.shift()
    if (seen.has(sm)) continue
    seen.add(sm)
    let xml
    try {
      xml = await (await fetch(sm, {
        signal: AbortSignal.timeout(TIMEOUT),
        headers: { 'User-Agent': UA },
      })).text()
    } catch (e) { errors.push(`${sm}: ${e.message}`); continue }
    const isIndex = /<sitemapindex/i.test(xml)
    for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      if (isIndex) queue.push(m[1]); else urls.add(m[1])
    }
  }
  if (errors.length) {
    console.error(`Warning: ${errors.length} sitemap fetch error(s):`)
    for (const e of errors) console.error(`  ${e}`)
  }
  return [...urls].map(normalizeUrl).filter(Boolean)
}

// ── Optional GSC impressions enrichment ──────────────────────────────────────
// Spawns seodeck_gsc.js querypages (must be in the same directory).
// Returns a Map<normalizedUrl, totalImpressions> or null on failure.

function fetchGscImpressions(site) {
  const scriptPath = resolve(dirname(process.argv[1]), 'seodeck_gsc.js')
  if (!existsSync(scriptPath)) {
    console.error(`Warning: seodeck_gsc.js not found at ${scriptPath} — skipping --gsc-property enrichment.`)
    return null
  }
  const r = spawnSync(process.execPath, [scriptPath, 'querypages', '--site', site, '--rowlimit', '5000'], {
    encoding: 'utf8',
    timeout: 90_000,
  })
  if (r.status !== 0) {
    console.error(`Warning: seodeck_gsc.js querypages failed (status ${r.status}):\n${r.stderr || '(no stderr)'}`)
    return null
  }
  let parsed
  try { parsed = JSON.parse(r.stdout) } catch (e) {
    console.error(`Warning: seodeck_gsc.js querypages returned non-JSON: ${e.message}`)
    return null
  }
  const pageImpressions = new Map()
  for (const row of parsed.rows ?? []) {
    const n = normalizeUrl(row.page)
    if (!n) continue
    pageImpressions.set(n, (pageImpressions.get(n) ?? 0) + (row.impressions ?? 0))
  }
  return pageImpressions
}

// ── Report helpers ────────────────────────────────────────────────────────────

function mdTable(headers, rows) {
  if (rows.length === 0) return ''
  const lines = [
    `| ${headers.join(' | ')} |`,
    `|${headers.map(h => '-'.repeat(h.length + 2)).join('|')}|`,
    ...rows.map(r => `| ${r.join(' | ')} |`),
  ]
  return lines.join('\n')
}

// ── Main ──────────────────────────────────────────────────────────────────────

// 1. Resolve sitemap URLs
let sitemapUrls
if (isOrigin) {
  const origin = new URL(sitemapArg).origin
  console.error(`Enumerating sitemap for ${origin}…`)
  sitemapUrls = await enumerateSitemap(origin)
  console.error(`  ${sitemapUrls.length} URLs enumerated.`)
} else {
  sitemapUrls = readUrlsFromCsv(sitemapArg)
}

// 2. Resolve GSC internal-links URLs
const gscUrls = readUrlsFromCsv(gscPath)

// 3. Set comparison
const sitemapSet = new Set(sitemapUrls)
const gscSet = new Set(gscUrls)

const sitemapOnly = sitemapUrls.filter(u => !gscSet.has(u))
const gscOnly = gscUrls.filter(u => !sitemapSet.has(u))
const both = sitemapUrls.filter(u => gscSet.has(u))

// Separate query-string URLs from clean ones in each direction
const sitemapOnlyClean = sitemapOnly.filter(u => !hasQueryString(u))
const sitemapOnlyQs = sitemapOnly.filter(u => hasQueryString(u))
const gscOnlyClean = gscOnly.filter(u => !hasQueryString(u))
const gscOnlyQs = gscOnly.filter(u => hasQueryString(u))

// 4. Optional GSC impressions enrichment
let gscPageImpressions = null
if (gscProperty) {
  console.error(`Fetching GSC impressions for ${gscProperty}…`)
  gscPageImpressions = fetchGscImpressions(gscProperty)
}

// 5. Build report
const sitemapLabel = isOrigin ? new URL(sitemapArg).origin : basename(sitemapArg)
const gscLabel = basename(gscPath)
const capStrength = gscUrls.length < 1000 ? 'strong — the export is under the cap' : 'weak (export is at or near the 1 000-row cap; absences may reflect the cutoff, not zero links)'

const lines = [
  '# Sitemap ↔ GSC Internal Links diff',
  '',
  `_Sitemap: **${sitemapLabel}** (${sitemapUrls.length} URLs) — GSC: **${gscLabel}** (${gscUrls.length} URLs)_`,
  '',
  '| Set | Count |',
  '|-----|-------|',
  `| In sitemap, not in GSC internal links | ${sitemapOnly.length}${sitemapOnlyQs.length ? ` (${sitemapOnlyQs.length} with query string)` : ''} |`,
  `| In GSC internal links, not in sitemap | ${gscOnly.length}${gscOnlyQs.length ? ` (${gscOnlyQs.length} with query string)` : ''} |`,
  `| In both | ${both.length} |`,
  '',
  `> **GSC export cap:** the "Top internally-linked pages" export caps at ~1 000 rows. A URL absent from the GSC set means "below the top-linked cutoff", not "zero internal links". On this export (${gscUrls.length} rows), the orphan signal is **${capStrength}**.`,
  '',
  '---',
  '',
  '## In sitemap, not in GSC internal links',
  '',
  'Pages the sitemap advertises that are absent from the GSC "top internally-linked" set. These are orphan candidates — weakly linked pages are harder for Google to discover and rank.',
  '',
  '**Recommended action:** add internal links from relevant existing pages to each entry. If a page here is intentionally thin or a redirect target, consider removing it from the sitemap instead.',
  '',
]

if (sitemapOnlyClean.length === 0) {
  lines.push('_None — all clean sitemap URLs are also in the GSC internally-linked set._')
} else {
  lines.push(mdTable(
    ['#', 'URL', 'Action'],
    sitemapOnlyClean.map((u, i) => [String(i + 1), u, 'add internal links'])
  ))
}

if (sitemapOnlyQs.length > 0) {
  lines.push('', `_${sitemapOnlyQs.length} URL(s) with query strings omitted — see the query-string section below._`)
}

lines.push(
  '',
  '---',
  '',
  '## In GSC internal links, not in sitemap',
  '',
  'Pages Google has observed via internal links that are absent from your sitemap. Each is one of:',
  '- **Sitemap gap** — a live page that should be advertised (action: add to sitemap)',
  '- **Stray / legacy URL** — Google is following old `href`s to a moved or removed page (action: fix the linking `href`s, or add a redirect; hand real 404s to the `error404/` instrument)',
  '',
  '**Recommended action:** verify each URL live — status 200 → add to sitemap; 3xx/4xx → fix the `href` or set up a redirect.',
  '',
)

if (gscOnlyClean.length === 0) {
  lines.push('_None — all clean GSC internally-linked URLs are also in the sitemap._')
} else {
  lines.push(mdTable(
    ['#', 'URL', 'Action'],
    gscOnlyClean.map((u, i) => [String(i + 1), u, 'verify live → add to sitemap or fix href'])
  ))
}

if (gscOnlyQs.length > 0) {
  lines.push('', `_${gscOnlyQs.length} URL(s) with query strings omitted — see the query-string section below._`)
}

// Optional impressions section
if (gscPageImpressions) {
  const gaps = [...gscPageImpressions.entries()]
    .filter(([u]) => !sitemapSet.has(u))
    .sort((a, b) => b[1] - a[1])

  lines.push(
    '',
    '---',
    '',
    `## High-confidence sitemap gaps (impressions via GSC, not in sitemap)`,
    '',
    `Pages receiving Google Search impressions (from \`seodeck_gsc.js querypages --site ${gscProperty}\`) that are absent from the sitemap. Google already knows and ranks these — they are the highest-priority sitemap additions.`,
    '',
  )
  if (gaps.length === 0) {
    lines.push('_None — every page receiving impressions is already in the sitemap._')
  } else {
    lines.push(mdTable(
      ['#', 'URL', 'Impressions', 'Action'],
      gaps.map(([u, imp], i) => [String(i + 1), u, String(imp), 'add to sitemap'])
    ))
  }
}

// Query-string section
const allQsSet = new Set([...sitemapOnlyQs, ...gscOnlyQs])
const allQs = [...allQsSet]
if (allQs.length > 0) {
  lines.push(
    '',
    '---',
    '',
    '## URLs with query strings (flagged — potential noise)',
    '',
    `${allQs.length} parameter-bearing URL(s) excluded from the main tables (in sitemap only: ${sitemapOnlyQs.length}; in GSC only: ${gscOnlyQs.length}). Query-string URLs may represent filtered views, tracking params, or session state — not distinct content.`,
    '',
    '**Review:** do any of these belong in the sitemap? If so, add them and ensure they return a `<link rel="canonical">` pointing to the clean URL.',
    '',
    mdTable(
      ['#', 'URL', 'In sitemap', 'In GSC'],
      allQs.map((u, i) => [
        String(i + 1),
        u,
        sitemapSet.has(u) || sitemapOnlyQs.includes(u) ? 'yes' : 'no',
        gscSet.has(u) || gscOnlyQs.includes(u) ? 'yes' : 'no',
      ])
    ),
  )
}

lines.push('')

writeFileSync(outPath, lines.join('\n'))

console.log(`sitemap-diff: sitemap ${sitemapUrls.length} URLs · GSC ${gscUrls.length} URLs → ${outPath}`)
console.log(`  sitemap-only (orphan candidates): ${sitemapOnly.length}`)
console.log(`  GSC-only (sitemap gaps / legacy): ${gscOnly.length}`)
console.log(`  in both: ${both.length}`)
if (allQs.length > 0) console.log(`  with query strings (flagged): ${allQs.length}`)
