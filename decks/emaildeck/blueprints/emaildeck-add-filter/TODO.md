---
lifecycle: one-shot
---

# emaildeck-add-filter
<!-- lifecycle: one-shot -->

## BOT

- [ ] Check if `.flowdeck/.emaildeck/` exists. If not, stop and note under `## HUMAN` to run `emaildeck-init` first.

- [ ] Read `## HUMAN` below for provider, filter name, slug, query, label, and default tasks. Stop and surface any missing values under `## HUMAN`.

- [ ] Validate provider is `gmail` or `microsoft`.

- [ ] Create `.flowdeck/.emaildeck/filters/{{FILTER_SLUG}}/`.

- [ ] Scaffold `FILTER.md` from `_energy-cards/FILTER.md.template` — substitute `{{PROVIDER}}`, `{{FILTER_NAME}}`, `{{QUERY}}`, `{{LABEL}}`, and `{{DEFAULT_TASKS}}`.

- [ ] Create `TODO.md` in `.flowdeck/.emaildeck/filters/{{FILTER_SLUG}}/`:

  ```markdown
  ---
  lifecycle: recurring
  recurrence: on-demand
  ---

  # {{FILTER_NAME}}

  ## BOT

  - [ ] fetch-emails — fetch matching messages from provider, apply label/category, create EMAIL.md cards

  ## HUMAN

  ## ACTIONS

  <!-- Move an item to ## BOT, then play this card to activate it. fetch-emails ships active above — remove it from ## BOT to pause this filter. -->

  - [ ] score-relevance — if .flowdeck/.crunchdeck/profile/PROFILE.md exists, append ## Relevance to each EMAIL.md
  - [ ] apply-enrichment — if FILTER.md has ## Enrichment section, apply those steps to each EMAIL.md

  #### COMMENTS
  ```

- [ ] Commit: `git add .flowdeck/.emaildeck/filters/{{FILTER_SLUG}} && git commit -m "deck: add email filter — {{FILTER_NAME}}"`.

## HUMAN

- [ ] Provider (`gmail` or `microsoft`):
  > _answer:_

- [ ] Filter name (human-readable):
  > _answer:_

- [ ] Filter slug (kebab-case, used as folder name):
  > _answer:_

- [ ] Email query (syntax depends on provider):
  > _answer:_
  >
  > **Gmail query syntax:**
  > - Specific sender: `from:name@example.com`
  > - All mail from a domain: `from:@company.com`
  > - Subject keyword: `subject:invoice`
  > - Relevant to a project (combine sender + keyword): `from:@client.com OR subject:ProjectName`
  > - Unread only: `is:unread from:@domain.com`
  >
  > **Outlook/Microsoft query syntax:**
  > - Specific sender: `from:"name@example.com"`
  > - All mail from a domain: `from:company.com`
  > - Subject keyword: `subject:invoice`
  > - Combine: `from:client.com subject:ProjectName`

- [ ] Label to apply to matched threads:
  > _answer:_ (e.g. `emaildeck/newsletters`)

- [ ] Default tasks for each message card — list them below, prefix with `BOT:` or `HUMAN:`:
  > _answer:_
  >
  > Common defaults:
  > - Auto-summarize: `BOT: summarize`
  > - Route to crunchdeck for project triage: `BOT: send-to-crunchdeck`
  > - Auto-archive after processing: `- [ ] archive`
  > - Flag junk reliably: `BOT: mark-to-delete`
  > - Relevance + summary combo: `BOT: summarize` then `BOT: send-to-crunchdeck`

#### COMMENTS
