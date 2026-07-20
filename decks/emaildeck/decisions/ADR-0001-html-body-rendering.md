# ADR-0001: emaildeck renders HTML-only email bodies to markdown in the runner

**Date:** 2026-07-20
**Author:** Ruco
**Status:** Accepted

---

## Context

`emaildeck_run.js` writes whatever `decodeBody()` returns into an `EMAIL.md`'s `## Body`. It preferred the message's `text/plain` MIME part and, when there was none, fell back to the `text/html` part **verbatim** — base64-decoded, but otherwise untouched:

```js
const data = findPart(payload, 'text/plain') ?? findPart(payload, 'text/html')
return Buffer.from(data…, 'base64').toString('utf8')   // raw markup if HTML-only
```

Marketing and form-notification emails (Mailchimp, contact-form plugins, Meta/Facebook ad receipts, newsletter digests) are frequently **HTML-only** — no `text/plain` alternative — so they hit that fallback and dumped a full document (`<!doctype>`, `<head>`, `<style>`, nested `<table>` layout) into the card. The actual content — a name, a phone number, "I'd like to book a consultation" — was buried under kilobytes of CSS and layout noise.

This was a live defect, not a hypothetical: 13 cards across `clients-hcv` and `xtage` carried raw HTML bodies (one newsletter card was 343 KB). `EMAIL.md` is the source of truth a human triages and that downstream routing (`send-to-creamdeck` / `send-to-crunchdeck`) reads, so raw markup there is effectively unreadable. The sibling `emaildeck-backfill-bodies` blueprint had the same weakness, instructing "fall back to `text/html` (strip tags)" — vague enough to reproduce the problem.

## Decision

**We will** render HTML-only bodies down to readable markdown inside the runner. `decodeBody()` keeps preferring `text/plain` unchanged; when it falls back to `text/html`, it routes the decoded markup through a new `htmlToText()` before returning. The Outlook adapter routes HTML `body.content` through the same function.

`htmlToText()` is a **dependency-free, self-contained** function defined at module scope in `emaildeck_run.js`: it drops `<head>`/`<style>`/`<script>`/comments (including MSO `<!--[if…]-->` conditionals), converts `<a href>`→`[text](url)` and `<strong>`/`<b>`→`**bold**`, turns block boundaries (`<br>`, `</p>`, `</div>`, `</tr>`, `<li>`) into line breaks, strips remaining tags, decodes HTML entities, and collapses whitespace. It aims for **legible triage output, not perfect fidelity**.

The `emaildeck-backfill-bodies` blueprint's step 4 is updated to describe the same rendering ("never write raw HTML into `## Body`"), and the 13 pre-existing raw-HTML cards were re-rendered in place.

## Rationale

- **Zero dependencies.** Every emaildeck script is self-contained zero-dep ESM (like creamdeck's `report.js`/`html.js`). Pulling in `turndown`/`cheerio`/`jsdom` would add install weight and a dependency surface to every live instance for a formatting nicety.
- **Self-contained, not a shared module.** `emaildeck_run.js` is copied per-instance (template → scaffold → each project's `.emaildeck/_scripts/`, plus `_sleeve`/`_scripts` staging copies) with no shared module-resolution path. Those copies had already drifted into six variants. A self-contained function is the only shape that (a) applies identically to every copy, (b) survives `flowdeck update`, and (c) doesn't break the "install is a file copy" model. The explicit cost — the renderer is duplicated across all runner copies and a change must be propagated to all — is accepted and documented.
- **Light markdown is enough.** Bold, links, and block breaks make a contact form or an ad receipt scannable. Chasing pixel-fidelity (nested tables, columns) buys nothing for triage.

## Alternatives Considered

### Option A: Add an HTML→markdown dependency (turndown / cheerio)
**Pros:** Robust parsing, handles malformed HTML better than regex. **Cons:** New runtime dependency in every instance; violates the deck's zero-dep posture. **Rejected** — disproportionate to "make the body readable."

### Option B: Naive tag strip (`replace(/<[^>]+>/g, '')` only)
**Pros:** Trivial. **Cons:** Leaves `<style>`/`<head>` CSS *text* and undecoded entities as garbage — this is essentially what the old backfill wording produced. **Rejected** — doesn't actually solve the problem.

### Option C: One shared `htmlToText` module imported by all runners
**Pros:** Single source of truth, no duplication. **Cons:** Runners are standalone copied files with no shared import path; a shared module breaks the file-copy install model and the `_sleeve`/update mechanics. The existing six-way drift shows copies diverge regardless. **Rejected** — incompatible with how the deck ships.

### Option D: Store raw HTML, render only on display
**Pros:** Lossless. **Cons:** `EMAIL.md` *is* the interface — read by humans and by downstream routing; there is no separate "display" layer. **Rejected.**

## Consequences

**Positive:** Bodies are readable; downstream routing gets clean text; the backfill repair tool and the runner now agree; 13 existing cards fixed.

**Negative / Risks:** The renderer is duplicated across all `emaildeck_run.js` copies — a change to it must be propagated to every copy (same discipline already required for any runner change). Tracking URLs are preserved verbatim (faithful but ugly) — deliberately not stripped, to avoid discarding real content. Rendering is best-effort: exotic HTML may format imperfectly, which is acceptable for triage.

## Implementation Notes

- `decks/emaildeck/scripts/emaildeck_run.js`: added module-scope `htmlToText()` + `decodeEntities()`; `gmailAdapter.decodeBody` prefers `text/plain`, renders the `text/html` fallback; `outlookAdapter.decodeBody` renders HTML `body.content`. `manifest.json` bumped `0.10.0` → `0.10.1`.
- `decks/emaildeck/blueprints/emaildeck-backfill-bodies`: step 4 rewritten to render, not strip.
- Propagated the identical change to all 14 `emaildeck_run.js` copies on disk (template, CLI scaffold, live instances, sleeve/staging copies) — the shared `decodeBody` core let one patch apply everywhere.
- Verification: `htmlToText` self-tested against the real offending HCV HTML; four integration cases (HTML-only → rendered; multipart plain+html → plain untouched; empty → `""`; nested multipart → recurses); `node --check` on all 14 files; 13 pre-existing raw-HTML cards re-rendered in place (structure — table, snippet, thread URL — preserved).

---
