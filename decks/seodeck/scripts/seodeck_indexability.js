// seodeck indexability checker — zero-dependency (node: builtins + global fetch).
//
// Per URL the sitemap advertises, derives one verdict:
//   non-200          — status ≠ 200 after redirects, or the sitemap entry redirects
//                      (chain recorded; restated here for completeness from routine 1)
//   blocked-robots   — robots.txt disallows the path
//   noindex-header   — X-Robots-Tag response header contains noindex or none
//   noindex-meta     — <meta name="robots"> or <meta name="googlebot"> contains noindex
//   canonical-elsewhere — <link rel="canonical"> resolves to a different normalised URL
//   indexable        — none of the above
//
// robots.txt: fetch once per origin and cache; parse User-agent: * and Googlebot
// groups; longest-path-match with Allow precedence; support $ and * wildcards.
// Simplified Googlebot semantics — not a full RFC 9309 implementation.
//
// Usage:
//   node seodeck_indexability.js --in <urls.csv> [--out <csv>] [--report <md>]
//                                [--concurrency 5] [--timeout 20000]
//                                [--inspect] [--site <property>] [--account <name>]
//
// CSV out: url,verdict,detail (+ gsc_verdict,gsc_coverage when --inspect is used).
// MD report: non-indexable rows only, grouped by verdict, with suggested action.
//
// --inspect: run seodeck_gsc.js inspect on flagged URLs only (never the full list —
//   quota: 2000/day + 600/min per property). The existing webmasters.readonly token
//   is sufficient — no re-consent needed if you have already run `seodeck_gsc.js connect`.

import { readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const UA = 'seodeck-indexability/0.1 (+https://github.com/ruco-dev/flowdeck)'
const MAX_HOPS = 10
const HEAD_LIMIT = 50 * 1024  // stop reading the response body after 50 KB

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const [, , ...argv] = process.argv

function flag(name, fallback) {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}

function usage(msg) {
  if (msg) console.error(`Error: ${msg}\n`)
  console.error('Usage:')
  console.error('  seodeck_indexability.js --in <urls.csv> [--out <csv>] [--report <md>]')
  console.error('                          [--concurrency 5] [--timeout 20000]')
  console.error('                          [--inspect] [--site <property>] [--account <name>]')
  process.exit(msg ? 1 : 0)
}

if (argv.includes('--help') || argv.includes('-h')) usage()

const inPath = flag('in')
if (!inPath) usage('--in <urls.csv> is required.')

const outPath  = flag('out', inPath.replace(/\.csv$/i, '') + '-indexability.csv')
const reportPath = flag('report', inPath.replace(/\.csv$/i, '') + '-indexability-report.md')
const concurrency = Math.max(1, parseInt(flag('concurrency', '5'), 10) || 5)
const timeout = Math.max(1000, parseInt(flag('timeout', '20000'), 10) || 20000)
const doInspect = argv.includes('--inspect')
const gscSite = flag('site', null)
const gscAccount = flag('account', null)

if (doInspect && !gscSite) usage('--inspect requires --site <property> (e.g. "sc-domain:example.com").')

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

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

function readUrls(filePath) {
  const raw = readFileSync(filePath, 'utf8')
  const rows = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  if (rows.length === 0) return []
  const first = splitCsvLine(rows[0])
  const urlColByName = first.findIndex(c => /^url$/i.test(c))
  let urlCol = 0, start = 0
  if (urlColByName >= 0) { urlCol = urlColByName; start = 1 }
  else if (!/(:\/\/|\.[a-z]{2,})/i.test(first[0] || '')) start = 1
  const urls = [], seen = new Set()
  for (let r = start; r < rows.length; r++) {
    const cells = splitCsvLine(rows[r])
    let u = (cells[urlCol] ?? cells[0] ?? '').replace(/^["']|["']$/g, '').trim()
    if (!u) continue
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u
    if (seen.has(u)) continue
    seen.add(u)
    urls.push(u)
  }
  return urls
}

function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// ---------------------------------------------------------------------------
// robots.txt — simplified Googlebot semantics
// ---------------------------------------------------------------------------

const robotsCache = new Map()

async function fetchRobots(origin) {
  if (robotsCache.has(origin)) return robotsCache.get(origin)
  let text = ''
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'user-agent': UA },
    })
    if (res.ok) text = await res.text()
    else try { await res.body?.cancel() } catch { /* ignore */ }
  } catch { /* unreachable → allow all */ }
  const groups = parseRobotsTxt(text)
  robotsCache.set(origin, groups)
  return groups
}

function parseRobotsTxt(text) {
  const groups = []
  let agents = null, rules = null
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim()
    if (!line) {
      if (agents?.length) groups.push({ agents, rules })
      agents = null; rules = null
      continue
    }
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const key = line.slice(0, colon).trim().toLowerCase()
    const val = line.slice(colon + 1).trim()
    if (key === 'user-agent') {
      if (!agents) { agents = []; rules = [] }
      agents.push(val.toLowerCase())
    } else if ((key === 'allow' || key === 'disallow') && agents) {
      rules.push({ type: key, pattern: val })
    }
  }
  if (agents?.length) groups.push({ agents, rules })
  return groups
}

function robotsPatternSpec(pattern) {
  return pattern.replace(/\*/g, '').replace(/\$$/, '').length
}

function robotsPatternMatches(pattern, pathAndQuery) {
  if (pattern === '') return true
  let r = ''
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '*') r += '.*'
    else if (c === '$' && i === pattern.length - 1) r += '$'
    else r += c.replace(/[.+?^{}()|[\]\\]/g, '\\$&')
  }
  try { return new RegExp('^' + r).test(pathAndQuery) } catch { return false }
}

function isDisallowedByRobots(groups, url) {
  let pathAndQuery
  try { const u = new URL(url); pathAndQuery = u.pathname + u.search } catch { return null }
  const relevant = groups.filter(g => g.agents.includes('*') || g.agents.includes('googlebot'))
  let bestSpec = -1, bestType = null, bestPattern = null
  for (const group of relevant) {
    for (const rule of group.rules) {
      // Empty Disallow means allow all — RFC 9309 §2.2.2
      if (rule.type === 'disallow' && rule.pattern === '') continue
      if (!robotsPatternMatches(rule.pattern, pathAndQuery)) continue
      const spec = robotsPatternSpec(rule.pattern)
      // Allow beats Disallow on equal specificity
      if (spec > bestSpec || (spec === bestSpec && rule.type === 'allow')) {
        bestSpec = spec; bestType = rule.type; bestPattern = rule.pattern
      }
    }
  }
  return bestType === 'disallow' ? bestPattern : null
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function fetchForIndexability(url) {
  const chain = []
  let current = url
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    let res
    try {
      res = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(timeout),
        headers: { 'user-agent': UA, accept: 'text/html,*/*' },
      })
    } catch (e) {
      const cause = e?.cause?.code || e?.code
      return { status: null, hops: hop, chain, finalUrl: current, headers: null, body: null, error: cause ? `${e.message} (${cause})` : e.message }
    }
    chain.push(res.status)
    if (res.status >= 300 && res.status < 400) {
      try { await res.body?.cancel() } catch { /* ignore */ }
      const loc = res.headers.get('location')
      if (!loc) return { status: res.status, hops: hop, chain, finalUrl: current, headers: res.headers, body: null, error: 'redirect without Location' }
      try { current = new URL(loc, current).toString() } catch {
        return { status: res.status, hops: hop, chain, finalUrl: current, headers: res.headers, body: null, error: `bad Location: ${loc}` }
      }
      continue
    }
    const body = res.status === 200 ? await readHeadHtml(res) : (await res.body?.cancel().catch(() => {}), null)
    return { status: res.status, hops: hop, chain, finalUrl: current, headers: res.headers, body, error: null }
  }
  return { status: null, hops: MAX_HOPS, chain, finalUrl: current, headers: null, body: null, error: `too many redirects (>${MAX_HOPS})` }
}

async function readHeadHtml(response) {
  const reader = response.body?.getReader()
  if (!reader) return ''
  const chunks = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      total += value.length
      if (total >= HEAD_LIMIT) break
      const text = Buffer.concat(chunks).toString('utf8')
      if (text.toLowerCase().includes('</head>')) break
    }
  } catch { /* truncate gracefully */ } finally {
    try { await reader.cancel() } catch { /* ignore */ }
  }
  return Buffer.concat(chunks).toString('utf8')
}

// ---------------------------------------------------------------------------
// HTML parsing helpers (same regex style as seodeck_site_checks.js)
// ---------------------------------------------------------------------------

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))
  return m ? (m[2] ?? m[3]) : null
}

function checkXRobotsTag(headers) {
  if (!headers) return null
  const xrt = (headers.get('x-robots-tag') || '').toLowerCase()
  for (const directive of xrt.split(',').map(s => s.trim())) {
    if (directive === 'noindex' || directive === 'none') return directive
  }
  return null
}

function checkMetaRobots(body) {
  if (!body) return null
  const re = /<meta\s[^>]*>/gi
  let m
  while ((m = re.exec(body)) !== null) {
    const tag = m[0]
    const name = (attr(tag, 'name') || '').toLowerCase()
    if (name === 'robots' || name === 'googlebot') {
      if ((attr(tag, 'content') || '').toLowerCase().includes('noindex')) return name
    }
  }
  return null
}

function normalizeUrl(url) {
  try {
    const u = new URL(url)
    u.hostname = u.hostname.toLowerCase()
    if (u.pathname !== '/' && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1)
    return u.toString()
  } catch { return url.toLowerCase() }
}

function checkCanonical(body, originalUrl) {
  if (!body) return null
  const re = /<link\s[^>]*>/gi
  let m
  while ((m = re.exec(body)) !== null) {
    const tag = m[0]
    if ((attr(tag, 'rel') || '').toLowerCase() !== 'canonical') continue
    const href = attr(tag, 'href')
    if (!href) continue
    let resolved
    try { resolved = new URL(href, originalUrl).toString() } catch { continue }
    if (normalizeUrl(resolved) !== normalizeUrl(originalUrl)) return resolved
  }
  return null
}

// ---------------------------------------------------------------------------
// Concurrency pool
// ---------------------------------------------------------------------------

async function mapPool(items, limit, worker) {
  const results = new Array(items.length)
  let next = 0
  async function run() {
    while (next < items.length) {
      const i = next++
      results[i] = await worker(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
  return results
}

// ---------------------------------------------------------------------------
// GSC inspect (--inspect flag)
// ---------------------------------------------------------------------------

function runGscInspect(flaggedUrls) {
  const gscScript = join(import.meta.dirname, 'seodeck_gsc.js')
  const args = ['inspect', '--site', gscSite]
  if (gscAccount) args.push('--account', gscAccount)
  args.push(...flaggedUrls)
  const r = spawnSync('node', [gscScript, ...args], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
  if (r.status !== 0) {
    console.error(`  GSC inspect failed (exit ${r.status}): ${r.stderr?.trim() || '(no output)'}`)
    return null
  }
  try { return JSON.parse(r.stdout) } catch { console.error('  Failed to parse GSC inspect output.'); return null }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const urls = readUrls(inPath)
if (urls.length === 0) usage(`no URLs found in ${inPath}`)

console.log(`seodeck_indexability: checking ${urls.length} URL(s) from ${basename(inPath)} …`)

const rows = await mapPool(urls, concurrency, async (url) => {
  const r = await fetchForIndexability(url)
  const chainStr = r.chain.join(' → ') + (r.finalUrl !== url ? ` → ${r.finalUrl}` : '')

  if (r.error)    return { url, verdict: 'non-200', detail: `error: ${r.error}` }
  if (r.hops > 0) return { url, verdict: 'non-200', detail: `redirects: ${chainStr}` }
  if (r.status !== 200) return { url, verdict: 'non-200', detail: `status ${r.status}` }

  let origin
  try { origin = new URL(url).origin } catch { origin = url }
  const robotsGroups = await fetchRobots(origin)
  const blockedRule = isDisallowedByRobots(robotsGroups, url)
  if (blockedRule) return { url, verdict: 'blocked-robots', detail: `Disallow: ${blockedRule}` }

  const xrt = checkXRobotsTag(r.headers)
  if (xrt) return { url, verdict: 'noindex-header', detail: `X-Robots-Tag: ${xrt}` }

  const metaTag = checkMetaRobots(r.body)
  if (metaTag) return { url, verdict: 'noindex-meta', detail: `<meta name="${metaTag}"> contains noindex` }

  const canonicalElsewhere = checkCanonical(r.body, url)
  if (canonicalElsewhere) return { url, verdict: 'canonical-elsewhere', detail: `canonical: ${canonicalElsewhere}` }

  return { url, verdict: 'indexable', detail: '' }
})

// GSC inspect on flagged URLs only
const gscMap = new Map()
if (doInspect) {
  const flagged = rows.filter(r => r.verdict !== 'indexable').map(r => r.url)
  if (flagged.length > 0) {
    console.log(`  Running GSC inspect on ${flagged.length} flagged URL(s)…`)
    const inspections = runGscInspect(flagged)
    if (inspections) {
      for (const item of inspections) {
        const sr = item.result?.indexStatusResult
        gscMap.set(item.url, { verdict: sr?.verdict || 'UNKNOWN', coverage: sr?.coverageState || '' })
      }
    }
  } else {
    console.log('  All URLs indexable — GSC inspect skipped.')
  }
}

// CSV output
const hasGsc = gscMap.size > 0
const csvHeader = hasGsc
  ? ['url', 'verdict', 'detail', 'gsc_verdict', 'gsc_coverage']
  : ['url', 'verdict', 'detail']
const csv = [csvHeader.join(',')]
  .concat(rows.map(row => {
    const cells = [row.url, row.verdict, row.detail]
    if (hasGsc) {
      const g = gscMap.get(row.url)
      cells.push(g?.verdict || '', g?.coverage || '')
    }
    return cells.map(csvCell).join(',')
  }))
  .join('\n') + '\n'
writeFileSync(outPath, csv)

// MD report — non-indexable only, grouped by verdict
const VERDICT_ORDER = ['non-200', 'blocked-robots', 'noindex-header', 'noindex-meta', 'canonical-elsewhere']
const ACTIONS = {
  'non-200': 'Remove from the sitemap or fix the URL destination; add a redirect if the content moved.',
  'blocked-robots': 'Remove the `Disallow` rule from `robots.txt` if this URL should be indexed, or remove it from the sitemap if it is intentionally private.',
  'noindex-header': 'Remove or change the `X-Robots-Tag` response header. Check CDN and server config — this header is often set outside the page source.',
  'noindex-meta': 'Remove the `noindex` directive from the `<meta name="robots">` or `<meta name="googlebot">` tag, or remove the URL from the sitemap.',
  'canonical-elsewhere': 'Update the sitemap to advertise the canonical URL shown in `detail`, or fix the `<link rel="canonical">` to self-reference this URL if it is the intended canonical.',
}

const counts = {}
for (const row of rows) counts[row.verdict] = (counts[row.verdict] || 0) + 1

const nonIndexable = rows.filter(r => r.verdict !== 'indexable')
const mdSections = []
for (const v of VERDICT_ORDER) {
  const group = nonIndexable.filter(r => r.verdict === v)
  if (!group.length) continue
  mdSections.push(`## ${v} (${group.length})`)
  mdSections.push('')
  mdSections.push(`**Action:** ${ACTIONS[v]}`)
  mdSections.push('')
  if (hasGsc) {
    mdSections.push('| URL | Detail | GSC verdict | GSC coverage |')
    mdSections.push('|-----|--------|-------------|--------------|')
    for (const row of group) {
      const g = gscMap.get(row.url)
      mdSections.push(`| ${row.url} | ${row.detail} | ${g?.verdict || ''} | ${g?.coverage || ''} |`)
    }
  } else {
    mdSections.push('| URL | Detail |')
    mdSections.push('|-----|--------|')
    for (const row of group) mdSections.push(`| ${row.url} | ${row.detail} |`)
  }
  mdSections.push('')
}

const summaryRows = [...VERDICT_ORDER, 'indexable']
  .filter(v => counts[v])
  .map(v => `| ${v} | ${counts[v]} |`)

const md = [
  `# Indexability report — ${basename(inPath)}`,
  '',
  `_${urls.length} URL(s) checked._`,
  '',
  '| Verdict | Count |',
  '|---------|-------|',
  ...summaryRows,
  '',
  ...(nonIndexable.length === 0
    ? ['**All URLs are indexable.** No sitemap defects found.', '']
    : mdSections),
].join('\n')
writeFileSync(reportPath, md)

console.log(`  → ${outPath}`)
console.log(`  → ${reportPath}`)
const parts = [...VERDICT_ORDER, 'indexable'].map(v => `${v} ${counts[v] || 0}`)
console.log(`  ${parts.join(' · ')}`)
