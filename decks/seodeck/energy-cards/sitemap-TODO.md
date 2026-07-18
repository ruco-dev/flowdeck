# sitemap — URL coverage & status check

Verify every URL the sitemap advertises is live and canonical: no redirects, no 404s,
no errors. The sitemap must advertise **final canonical 200s only** — a redirect is a
finding, not a pass. This is the superset of the GSC internally-linked set; the gap
between the two sets is what routine 2 (`seodeck-sitemap-gsc-diff`) investigates.

## BOT

- [ ] Resolve the origin. Check the `Origin` answer under `## HUMAN` — if blank, read
  the site's `README.md` or `.flowdeck/AGENT.md`. Then enumerate:
  `node .flowdeck/.seodeck/_scripts/seodeck_site_checks.js sitemap --url <origin> --out .flowdeck/.seodeck/sitemap/sitemap-urls.csv`
  Report: sitemaps discovered, URL count written to CSV.

- [ ] Check all advertised URLs:
  `node .flowdeck/.seodeck/_scripts/seodeck_error404.js --in .flowdeck/.seodeck/sitemap/sitemap-urls.csv --out .flowdeck/.seodeck/sitemap/sitemap-status.csv --redirects .flowdeck/.seodeck/sitemap/sitemap-redirects.md --concurrency 5 --timeout 20000`
  Lower concurrency and higher timeout are intentional for large sitemaps (big-list lesson: servers rate-limit aggressive fetchers).

- [ ] **Classify and report** (sitemap-specific semantics — stricter than `error404/`):
  Read `sitemap-status.csv`. Classify each row:
  - `ok` (status 200, `redirected = false`) — correctly advertised; no action.
  - `redirected` — **sitemap finding**: this entry points to a URL that redirects. The sitemap must advertise the `final_url` instead; list these under `## SITEMAP FIXES` (old URL → final URL, chain, hops).
  - `broken` (4xx/5xx, `base_status` != 200) — fix the page or drop this entry and add it to the redirect plan in `sitemap-redirects.md`. List under `## BROKEN`.
  - `error` (no response / timeout) — list under `## ERRORS`; retry at `--concurrency 2 --timeout 30000` before classifying as broken.
  Report totals: ok / redirected / broken / error.

## HUMAN

- [ ] Origin — the site's root URL (e.g. `https://example.com`). **Leave blank to infer from README.md or AGENT.md**:
  > _answer:_

## ACTIONS

<!-- Move an item to ## BOT (bot executes) or ## HUMAN (you handle it) to activate. -->

- [ ] diff-gsc — compare this sitemap set against the GSC "Top internally-linked pages" export already in `../internal-links/`: `node .flowdeck/.seodeck/_scripts/seodeck_sitemap_diff.js --sitemap .flowdeck/.seodeck/sitemap/sitemap-urls.csv --gsc .flowdeck/.seodeck/internal-links/internal-links.csv --out .flowdeck/.seodeck/sitemap/sitemap-gsc-diff.md` (if `sitemap-urls.csv` is stale, pass the origin instead: `--sitemap https://example.com`)
- [ ] re-check-errors — re-run the checker for only the `error` rows at `--concurrency 2 --timeout 30000`
- [ ] export-sitemap-fixes — write the `## SITEMAP FIXES` list as a `sitemap-fixes.md` table the human applies to the sitemap source
- [ ] export-rankmath — turn `sitemap-redirects.md` (broken URLs) into `redirects-rankmath.json`: `node .flowdeck/.seodeck/_scripts/seodeck_redirect_export.js --in .flowdeck/.seodeck/sitemap/sitemap-redirects.md --format rankmath`
- [ ] export-htaccess — same, Apache format: `seodeck_redirect_export.js --in sitemap-redirects.md --format htaccess`
- [ ] send-to-crunchdeck — route broken / redirected findings to the product backlog
- [ ] discard

#### COMMENTS

- Pagination-phantom logic (`base_status`) is **inert** on sitemap input — sitemaps rarely advertise paginated params — but harmless; do not special-case it.
- `error404/` cross-checks broken URLs that are still in the sitemap; this card is the **inverse and superset**: every advertised URL verified, regardless of GSC history.
- No seed CSV — the source is the live sitemap fetched by `site_checks sitemap --out`, not a GSC export. That is why this card has no starter CSV.
- HCV baseline (2026-07-15): ~5 sitemaps, ~614 URLs. The GSC internally-linked set was 564 URLs — the 50-URL gap is the sitemap-only set routine 2 investigates.
