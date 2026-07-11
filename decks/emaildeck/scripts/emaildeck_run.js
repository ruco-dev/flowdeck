#!/usr/bin/env node
// Usage: node .flowdeck/.emaildeck/_scripts/emaildeck_run.js --filter <slug>

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const emaildeckDir = join(__dirname, '..')
const flowdeckDir  = join(emaildeckDir, '..')

// Resolve an operational dir by its plain (0.9.0+, ADR-0006) name, falling back
// to the legacy `_`-prefixed name if only that exists on disk. Defaults to the
// plain name when neither is present, so a fresh 0.9.0 layout gets plain dirs
// and a not-yet-migrated 0.8.0 instance still resolves its `_`-prefixed ones.
function resolveDir(plain) {
  const plainPath  = join(emaildeckDir, plain)
  const legacyPath = join(emaildeckDir, `_${plain}`)
  if (existsSync(plainPath))  return plainPath
  if (existsSync(legacyPath)) return legacyPath
  return plainPath
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const filterIdx = process.argv.indexOf('--filter')
if (filterIdx === -1 || !process.argv[filterIdx + 1]) {
  console.error('Usage: node emaildeck_run.js --filter <slug>')
  process.exit(1)
}
const filterSlug = process.argv[filterIdx + 1]
const filterDir  = join(resolveDir('filters'), filterSlug)
const inboxDir   = resolveDir('mail-inbox')
const filterMdPath = join(filterDir, 'FILTER.md')

if (!existsSync(filterMdPath)) {
  console.error(`FILTER.md not found: ${filterMdPath}`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Parse FILTER.md
// ---------------------------------------------------------------------------

function parseFilterMd(src) {
  const section = name => {
    const re = new RegExp(`## ${name}[^\\S\\n]*\\n([\\s\\S]*?)(?=\\n## |$)`)
    return (src.match(re)?.[1] ?? '').trim()
  }

  const queryBlock = section('Query')
  const query = (queryBlock.match(/```[\s\S]*?\n([\s\S]*?)\n```/) ?? [])[1]?.trim()
              ?? queryBlock.replace(/```/g, '').trim()

  const label = section('Label')

  const provider = section('Provider').toLowerCase() || 'gmail'

  const tasksBlock = section('Default Tasks')
  const botTasks    = []
  const humanTasks  = []
  for (const line of tasksBlock.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('>')) continue
    if (t.startsWith('BOT:'))   botTasks.push(t.replace(/^BOT:\s*/, '').trim())
    else if (t.startsWith('HUMAN:')) humanTasks.push(t.replace(/^HUMAN:\s*/, '').trim())
    else humanTasks.push(t)
  }

  const toDomain = section('To Domain').trim().replace(/^@/, '')

  // Date range: explicit section overrides, else derive from run log
  const dateRangeBlock = section('Date Range').trim()
  let afterDate = null
  if (dateRangeBlock) {
    const m = dateRangeBlock.match(/after:\s*(\d{4}\/\d{2}\/\d{2})/)
    if (m) afterDate = m[1]
  }

  if (!afterDate) {
    const runLogBlock = section('Run Log')
    const rows = runLogBlock.split('\n').filter(l => /^\|\s*\d{4}-\d{2}-\d{2}/.test(l))
    if (rows.length > 0) {
      const lastDate = rows[rows.length - 1].split('|')[1].trim()
      afterDate = lastDate.replace(/-/g, '/')
    }
  }

  if (!afterDate) {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    afterDate = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
  }

  return { query, label, provider, botTasks, humanTasks, afterDate, toDomain }
}

const filter = parseFilterMd(readFileSync(filterMdPath, 'utf8'))

// Validate provider upfront — fail fast with a clear message before any API calls.
if (!['gmail', 'microsoft'].includes(filter.provider)) {
  console.error(`Unknown provider "${filter.provider}" in FILTER.md ## Provider. Must be "gmail" or "microsoft".`)
  process.exit(1)
}

const TOKEN_PATH_FOR_PROVIDER = {
  gmail:     join(homedir(), '.config', 'flowdeck', 'tokens', 'google.json'),
  microsoft: join(homedir(), '.config', 'flowdeck', 'tokens', 'microsoft.json'),
}
const AUTH_CMD_FOR_PROVIDER = {
  gmail:     'flowdeck auth google',
  microsoft: 'flowdeck auth microsoft',
}
if (!existsSync(TOKEN_PATH_FOR_PROVIDER[filter.provider])) {
  console.error(`No token for provider "${filter.provider}". Run: ${AUTH_CMD_FOR_PROVIDER[filter.provider]}`)
  process.exit(1)
}

console.log(`Filter:   ${filterSlug}`)
console.log(`Provider: ${filter.provider}`)
console.log(`Query:    ${filter.query}`)
console.log(`Label:    ${filter.label}`)
console.log(`After:    ${filter.afterDate}`)

// ---------------------------------------------------------------------------
// Auth & Provider Adapters
// ---------------------------------------------------------------------------

const gmailAdapter = {
  async getToken() {
    const tokenPath = join(homedir(), '.config', 'flowdeck', 'tokens', 'google.json')
    const oauthPath = join(homedir(), '.config', 'flowdeck', 'google-oauth.json')

    if (!existsSync(tokenPath)) {
      console.error('No token found. Run: flowdeck auth google')
      process.exit(1)
    }
    const token = JSON.parse(readFileSync(tokenPath, 'utf8'))

    if (Date.now() >= token.expiry_date - 60_000) {
      console.log('Token expired — refreshing…')
      const oauth = JSON.parse(readFileSync(oauthPath, 'utf8')).installed
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     oauth.client_id,
          client_secret: oauth.client_secret,
          refresh_token: token.refresh_token,
          grant_type:    'refresh_token',
        }),
      })
      if (!res.ok) {
        console.error(`Token refresh failed (${res.status}). Run: flowdeck auth google --force`)
        process.exit(1)
      }
      const fresh = await res.json()
      token.access_token = fresh.access_token
      token.expiry_date  = Date.now() + fresh.expires_in * 1000
      writeFileSync(tokenPath, JSON.stringify(token, null, 2))
      console.log('Token refreshed.')
    }

    return token.access_token
  },

  async ensureLabel(name, accessToken) {
    const { labels } = await this.apiGet('/labels', accessToken)
    const existing = labels.find(l => l.name === name)
    if (existing) return existing.id
    console.log(`Creating label: ${name}`)
    const created = await this.apiPost('/labels', { name }, accessToken)
    return created.id
  },

  async listThreads(query, afterDate, accessToken) {
    const threads = []
    const q = encodeURIComponent(`${query} after:${afterDate.replace(/\//g, '/')}`)
    let pageToken = ''
    do {
      const url = `/threads?q=${q}&maxResults=100${pageToken ? `&pageToken=${pageToken}` : ''}`
      const data = await this.apiGet(url, accessToken)
      if (data.threads) threads.push(...data.threads)
      pageToken = data.nextPageToken ?? ''
    } while (pageToken)
    return threads
  },

  async getThread(threadId, accessToken) {
    return this.apiGet(`/threads/${threadId}?format=full`, accessToken)
  },

  async applyLabel(threadId, labelId, accessToken) {
    await this.apiPost(`/threads/${threadId}/modify`, { addLabelIds: [labelId] }, accessToken)
  },

  async apiGet(path, accessToken) {
    const res = await fetch(`https://www.googleapis.com/gmail/v1/users/me${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.status === 401) {
      console.error('401 Unauthorized. Run: flowdeck auth google --force')
      process.exit(1)
    }
    if (!res.ok) throw new Error(`Gmail API error ${res.status}: ${await res.text()}`)
    return res.json()
  },

  async apiPost(path, body, accessToken) {
    const res = await fetch(`https://www.googleapis.com/gmail/v1/users/me${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Gmail API error ${res.status}: ${await res.text()}`)
    return res.json()
  },

  decodeBody(payload) {
    const findPart = (p, mime) => {
      if (p.mimeType === mime && p.body?.data) return p.body.data
      for (const part of p.parts ?? []) {
        const found = findPart(part, mime)
        if (found) return found
      }
      return null
    }
    const data = findPart(payload, 'text/plain') ?? findPart(payload, 'text/html')
    if (!data) return ''
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  },

  getHeader(headers, name) {
    return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
  },

  createThreadUrl(threadId) {
    return `https://mail.google.com/mail/u/0/#inbox/${threadId}`
  },
}

const outlookAdapter = {
  async getToken() {
    const tokenPath = join(homedir(), '.config', 'flowdeck', 'tokens', 'microsoft.json')
    const oauthPath = join(homedir(), '.config', 'flowdeck', 'microsoft-oauth.json')

    if (!existsSync(tokenPath)) {
      console.error('No token found. Run: flowdeck auth microsoft')
      process.exit(1)
    }
    const token = JSON.parse(readFileSync(tokenPath, 'utf8'))

    if (Date.now() >= (token.expiry_date ?? 0) - 60_000) {
      console.log('Token expired — refreshing…')
      const oauth = JSON.parse(readFileSync(oauthPath, 'utf8')).web ?? JSON.parse(readFileSync(oauthPath, 'utf8')).installed
      const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     oauth.client_id,
          client_secret: oauth.client_secret,
          refresh_token: token.refresh_token,
          grant_type:    'refresh_token',
          scope:         'offline_access Mail.ReadWrite',
        }),
      })
      if (!res.ok) {
        console.error(`Token refresh failed (${res.status}). Run: flowdeck auth microsoft --force`)
        process.exit(1)
      }
      const fresh = await res.json()
      token.access_token = fresh.access_token
      token.expiry_date  = Date.now() + fresh.expires_in * 1000
      writeFileSync(tokenPath, JSON.stringify(token, null, 2))
      console.log('Token refreshed.')
    }

    return token.access_token
  },

  async ensureLabel(name, accessToken) {
    // Outlook uses categories instead of labels
    // For now, we'll use the category name as-is (no need to create)
    console.log(`Using category: ${name}`)
    return name
  },

  async listThreads(query, afterDate, accessToken) {
    const messages = []
    const outlookQuery = this.convertQuery(query)
    const afterDateObj = new Date(afterDate.replace(/\//g, '-'))
    const afterIso = afterDateObj.toISOString()

    // Graph API does not support $filter + $search together.
    // Use $filter only (receivedDateTime + from/subject clauses).
    // $search (KQL) would be simpler but can't be combined with date filtering.
    const filterClauses = [`receivedDateTime ge ${afterIso}`]
    const fromMatch = outlookQuery.match(/from:"?([^"\s]+)"?/)
    if (fromMatch) filterClauses.push(`from/emailAddress/address eq '${fromMatch[1]}'`)

    let nextLink = ''
    do {
      const url = nextLink || `https://graph.microsoft.com/v1.0/me/messages?$filter=${encodeURIComponent(filterClauses.join(' and '))}&$top=50&$select=id,subject,from,receivedDateTime,bodyPreview,body`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.status === 401) {
        console.error('401 Unauthorized. Run: flowdeck auth microsoft --force')
        process.exit(1)
      }
      if (!res.ok) throw new Error(`Outlook API error ${res.status}: ${await res.text()}`)
      const data = await res.json()
      if (data.value) messages.push(...data.value)
      nextLink = data['@odata.nextLink'] ?? ''
    } while (nextLink)
    return messages
  },

  async getThread(messageId, accessToken) {
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error(`Outlook API error ${res.status}: ${await res.text()}`)
    return res.json()
  },

  async applyLabel(messageId, category, accessToken) {
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: [category] }),
    })
    if (!res.ok) throw new Error(`Outlook API error ${res.status}: ${await res.text()}`)
  },

  decodeBody(message) {
    return message.bodyPreview || message.body?.content || ''
  },

  getHeader(message, name) {
    // Outlook message doesn't have headers like Gmail; use properties instead
    const map = {
      'from': message.from?.emailAddress?.address || '',
      'subject': message.subject || '',
      'date': message.receivedDateTime || '',
    }
    return map[name.toLowerCase()] || ''
  },

  convertQuery(gmailQuery) {
    // Convert Gmail query syntax to Outlook search syntax
    let outlook = gmailQuery
    outlook = outlook.replace(/from:@([^\s]+)/g, 'from:$1')
    outlook = outlook.replace(/from:([^\s]+)/g, 'from:"$1"')
    outlook = outlook.replace(/subject:([^\s]+)/g, 'subject:"$1"')
    return outlook
  },

  createThreadUrl(messageId) {
    return `https://outlook.live.com/mail/0/inbox/id/${messageId}`
  },
}

// ---------------------------------------------------------------------------
// Slug helpers
// ---------------------------------------------------------------------------

function toSlug(subject) {
  return subject
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

function uniqueSlug(date, subject) {
  const base = `${date}-${toSlug(subject)}`
  let slug = base
  let n = 2
  while (existsSync(join(inboxDir, slug))) {
    slug = `${base}-${n++}`
  }
  return slug
}

// ---------------------------------------------------------------------------
// Card scaffolding
// ---------------------------------------------------------------------------

// Deterministic parity with the old manual add-filter flow: these two entries
// were existence checks written in prose, not model judgment, so the runner
// can apply them itself.
const hasCreamdeck  = existsSync(join(flowdeckDir, '.creamdeck'))
const hasCrunchdeck = existsSync(join(flowdeckDir, '.crunchdeck'))

const ACTIONS_MENU = [
  '- [ ] summarize',
  '- [ ] draft-reply — [describe what the reply should say]',
  '- [ ] improve-language — [target tone, e.g. "more concise" or "formal"]',
  '- [ ] create-card',
  '- [ ] extract-tasks',
  '- [ ] label — [label name]',
  '- [ ] forward — [recipient and context]',
  '- [ ] translate — [target language]',
  '- [ ] snooze — [date or condition]',
  '- [ ] archive',
  '- [ ] mark-to-delete',
  ...(hasCreamdeck  ? ['- [ ] send-to-creamdeck'] : []),
  ...(hasCrunchdeck ? ['- [ ] send-to-crunchdeck'] : []),
].join('\n')

function scaffoldEmail({ subject, from, date, threadId, labelName, snippet, body, threadUrl }) {
  return `# Email: ${subject}

| Field | Value |
|-------|-------|
| From | ${from} |
| Date | ${date} |
| Thread ID | ${threadId} |
| Label applied | ${labelName} |
| Filter | ${filterSlug} |

## Snippet

${snippet}

## Body

${body.trim()}

## Thread URL

${threadUrl}
`
}

function scaffoldTodo({ subject, botTasks, humanTasks }) {
  const botLines    = botTasks.map(t => `- [ ] ${t}`).join('\n')
  const humanLines  = humanTasks.map(t => `- [ ] ${t}`).join('\n')
  return `# ${subject}

## BOT

${botLines}

## HUMAN

${humanLines}

## ACTIONS

<!-- Move any item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate -->

${ACTIONS_MENU}

#### COMMENTS
`
}

// ---------------------------------------------------------------------------
// Existing thread IDs (dedup)
// ---------------------------------------------------------------------------

function existingThreadIds() {
  const ids = new Set()
  if (!existsSync(inboxDir)) return ids
  for (const entry of readdirSync(inboxDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const emailMd = join(inboxDir, entry.name, 'EMAIL.md')
    if (!existsSync(emailMd)) continue
    const m = readFileSync(emailMd, 'utf8').match(/\|\s*Thread ID\s*\|\s*(\S+)\s*\|/)
    if (m) ids.add(m[1])
  }
  return ids
}

// ---------------------------------------------------------------------------
// Run log
// ---------------------------------------------------------------------------

function appendRunLog(threadsFound, labeled, cardsCreated) {
  const today = new Date().toISOString().slice(0, 10)
  const src   = readFileSync(filterMdPath, 'utf8')
  const row   = `| ${today} | ${threadsFound} | ${labeled} | ${cardsCreated} |`
  const updated = src.replace(
    /(## Run Log[\s\S]*?\|[-| ]+\|\n)([\s\S]*?)(\n## |\n*$)/,
    (_, header, rows, tail) => {
      // `rows` can arrive without a trailing newline (the lazy capture yields
      // it to `tail`'s `\n*$` branch when Run Log is the last section) — without
      // this guard the new row gets concatenated straight onto the last one.
      const sep = rows && !rows.endsWith('\n') ? '\n' : ''
      return `${header}${rows}${sep}${row}\n${tail}`
    }
  )
  writeFileSync(filterMdPath, updated)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const adapter = filter.provider === 'microsoft' ? outlookAdapter : gmailAdapter

const accessToken = await adapter.getToken()
const labelId     = await adapter.ensureLabel(filter.label, accessToken)
console.log(`Label: ${labelId}`)

const effectiveQuery = filter.toDomain
  ? `${filter.query} to:@${filter.toDomain}`
  : filter.query
const allThreads = await adapter.listThreads(effectiveQuery, filter.afterDate, accessToken)
console.log(`Threads found: ${allThreads.length}`)

const seen = existingThreadIds()
const newThreads = allThreads.filter(t => !seen.has(t.id))
console.log(`New (no existing card): ${newThreads.length}`)

mkdirSync(inboxDir, { recursive: true })

let labeled = 0
let created = 0

for (const thread of newThreads) {
  const threadId = thread.id
  let subject, from, date, snippet, body

  if (filter.provider === 'microsoft') {
    subject = thread.subject || '(no subject)'
    from = thread.from?.emailAddress?.address || ''
    date = thread.receivedDateTime ? new Date(thread.receivedDateTime).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    snippet = thread.bodyPreview || ''
    body = thread.body?.content || ''
  } else {
    const fullThread = await adapter.getThread(threadId, accessToken)
    const msg = fullThread.messages[0]
    const headers = msg.payload.headers

    subject = adapter.getHeader(headers, 'Subject') || '(no subject)'
    from = adapter.getHeader(headers, 'From')
    const rawDate = adapter.getHeader(headers, 'Date')
    date = rawDate ? new Date(rawDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    snippet = fullThread.snippet ?? ''
    body = adapter.decodeBody(msg.payload)
  }

  // Apply label/category
  await adapter.applyLabel(threadId, labelId, accessToken)
  labeled++

  // Scaffold card
  const slug = uniqueSlug(date, subject)
  const cardDir = join(inboxDir, slug)
  mkdirSync(cardDir, { recursive: true })

  writeFileSync(join(cardDir, 'EMAIL.md'), scaffoldEmail({
    subject, from, date, threadId,
    labelName: filter.label,
    snippet,
    body,
    threadUrl: adapter.createThreadUrl(threadId),
  }))

  writeFileSync(join(cardDir, 'TODO.md'), scaffoldTodo({
    subject,
    botTasks:   filter.botTasks,
    humanTasks: filter.humanTasks,
  }))

  console.log(`  ✓ ${slug}`)
  created++
}

appendRunLog(allThreads.length, labeled, created)

console.log(`\nDone — ${created} card(s) created, ${allThreads.length - newThreads.length} skipped (already exist).`)
