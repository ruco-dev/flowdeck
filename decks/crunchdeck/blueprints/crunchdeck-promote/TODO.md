---
lifecycle: one-shot
---

# crunchdeck-promote
<!-- lifecycle: one-shot -->

## BOT

- [ ] Read `.crunchdeck/BACKLOG.md` and `.crunchdeck/ROADMAP.md` and `.crunchdeck/PROFILE.md`.

- [ ] List all `## Candidate Items` with Priority P0 or P1 not yet referenced in ROADMAP.

- [ ] For each candidate to promote:
  - Assign horizon: Now / Next / Later
  - Draft an outcome (what changes for the user when done)
  - Draft a hypothesis: "If we build X, we expect Y, measured by Z"
  - Trace the metric to PROFILE.md's north-star metric

- [ ] Add each as a row in the appropriate ROADMAP horizon table. Status: `Planned`.

- [ ] In BACKLOG.md `## Promotion Log`, add a row per item: Item, Promoted to, Date.

- [ ] Commit: `git add .crunchdeck/ && git commit -m "deck: promote backlog → roadmap"`.

## HUMAN

#### COMMENTS
