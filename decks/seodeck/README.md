# seodeck

SEO and content-strategy operations as flowdeck cards. Installs into a website
repo and turns page audits, content planning, and **broken-link / 404 → redirect**
work into replayable folder cards. Workflow successor to sitegrow-as-product: the
knowledge lives here; the code stays archived (extract-on-demand — see `AGENT.md`).

> **Local deck** (not in the public registry). Install by path or with
> `FLOWDECK_DECKS_DIR` set — see the repo's `LOCAL-DECKS.md`. It stays local until
> the mdblu `skills` release lands (skill resolution currently works on-machine only).

## Install

```bash
# from a project (scaffolds .flowdeck/ if needed, plays seodeck-init)
FLOWDECK_DECKS_DIR=/path/to/flowdeck/decks flowdeck install seodeck
# or by path
flowdeck install /path/to/flowdeck/decks/seodeck
```

`seodeck-init` (sleeve ritual — replay = `install --repair`) scaffolds the
`.seodeck/` tree: the `audits/`, `plan/`, `error404/`, `external-links/`,
`internal-links/`, `inspect-urls/` instrument cards, their starter CSVs,
`ACTIONS.md`, `README.md`, and `AGENT.md`.

## What it does

### Audit & plan (skill-driven)
- **`seodeck-audit-page`** *(sleeve ritual — `flowdeck play seodeck-audit-page --with target=<path>`)* — acquire a page → map it to the section taxonomy →
  apply each mdblu marketing skill as an audit pass → write a dated `AUDIT.md`.
  When a live URL / GSC property is given it adds data-backed dimensions:
  **Technical**, **Broken links** (internal + outbound), **Structured Data**,
  **Search Performance**. Skills applied are stamped into every artifact.
- **`seodeck-plan-content`** — inventory → keyword map → topic clusters →
  architecture → dated `PLAN.md`.

### Broken-link / 404 → redirect pipeline
Three folder-card instruments share **one engine** (`seodeck_error404.js`) — they
are all *potential 404s*, differing only in the source list. Drop the matching
GSC export as each one's CSV and play it:

| Instrument | Source (GSC export) | Deliverable |
|---|---|---|
| `error404/` | Not-found (404) report | real 404s → redirect plan |
| `external-links/` | Top externally-linked pages | broken pages wasting backlink equity |
| `internal-links/` | Top internally-linked pages | broken internal links (prefer fixing the `href`) |
| `sitemap/` | live sitemap (robots.txt → index → urlsets) | redirected / broken entries → sitemap fixes + redirect plan |

Flow per instrument: **check** (follow redirects, classify, auto-detect pagination
phantoms) → **suggest destinations** (GSC query→page map → Wayback keyword recovery
→ domain web search → homepage fallback; honours project-local conventions in
`.flowdeck/AGENT.md`) → **verify 200** → **export** (RankMath settings JSON /
Apache `.htaccess`) → **`verify-redirects`** after you import them. `error404` also
cross-checks the sitemap (broken URLs still advertised).

### Index-status triage
- **`inspect-urls`** — inspect a set of URLs (or the sitemap) via the GSC **URL
  Inspection API** (read-only, `webmasters.readonly` scope) and triage each by
  index status. Pages with a problem (not indexed, canonical mismatch, blocked,
  fetch error) become HUMAN *resolve* tasks; clean pages become HUMAN
  *request-index* tasks — each a one-click deep-link into the GSC inspection
  panel. There is no API that force-indexes a general page, so the "Request
  Indexing" click stays manual by design.

## Scripts (`scripts/`, zero-dependency Node)

| Script | Purpose |
|---|---|
| `seodeck_gsc.js` | Search Console: `connect`, `sites`, `fetch`, `querypages` (query→page map), `inspect` (URL Inspection: index status per URL) |
| `seodeck_site_checks.js` | `technical` / `schema` / `links` (single-page, incl. outbound) / `sitemap` |
| `seodeck_error404.js` | shared link-check engine: URL list → broken + redirect plan |
| `seodeck_wayback.js` | recover a dead page's title/keywords from the Internet Archive |
| `seodeck_redirect_export.js` | redirect plan → `redirects.htaccess` / `redirects-rankmath.json` |
| `seodeck_verify_redirects.js` | post-import check: each source now 301s to its destination |
| `seodeck_indexability.js` | per-URL indexability: noindex header/meta, robots.txt block, canonical drift; `--inspect` adds GSC URL Inspection for flagged URLs |
| `seodeck_sitemap_diff.js` | sitemap ↔ GSC internal-links diff: orphan candidates + sitemap gaps + optional impressions enrichment |

Full command reference and conventions are in [`AGENT.md`](AGENT.md).

## Layout

```
manifest.json          — deck manifest (v0.8.0)
AGENT.md               — deck context, installed to .seodeck/AGENT.md
AGENT-section.md       — appended to the project .flowdeck/AGENT.md on install
blueprints/            — seodeck-audit-page, seodeck-plan-content
sleeve-cards/          — seodeck-init (the install/repair ritual)
scripts/               — the eight data scripts above
energy-cards/          — AUDIT-REPORT / CONTENT-PLAN templates + instrument card bodies
```
