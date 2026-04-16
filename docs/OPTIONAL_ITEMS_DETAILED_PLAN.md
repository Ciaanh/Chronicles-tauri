# Optional Items Detailed Plan

Date: 2026-04-16

## Objective
Execute the remaining optional backlog in a controlled way:
- Replace generic search links with canonical wiki article links where possible.
- Improve event-to-entity linkage (characterIds, factionIds) for imported events.
- Apply final editorial consistency checks.

This plan is based on verified source availability in docs/TIMELINE_SOURCES_VERIFIED_EXTRACT.md.

## Baseline and Targets

### Baseline
- Events: 321
- Empty links: 0
- Search links: 320
- Direct wiki links: 0
- Events with empty characterIds: 234
- Events with empty factionIds: 233

### Target outcomes (optional quality milestone)
- Search links reduced from 320 to <= 40 in first pass.
- At least 180 events linked to >= 1 character.
- At least 180 events linked to >= 1 faction.
- No regressions in timeline flags and year validity.

## Workstreams

### WS1 - Canonical Link Normalization
Goal: convert Special:Search links to canonical article links.

#### WS1.1 Candidate generation
- For each event with search link:
  - Generate candidate title slug from event name.
  - Generate aliases from known lore terms (apostrophes, punctuation, subtitle variants).
  - Build candidate URL list in priority order.

#### WS1.2 Validation
- Validate candidate URLs by checking page existence and matching title context.
- If multiple plausible pages exist, keep search link and mark for manual review.

#### WS1.3 Writeback
- Update link only when confidence is high.
- Preserve original search link in an audit file for rollback traceability.

#### WS1.4 Deliverables
- data/link-normalization-report.json
- ChroniclesDB.json link updates
- Summary metrics before/after

#### WS1 acceptance criteria
- >= 280 canonical links (or equivalent reduction target with reasoned exceptions)
- 0 broken/empty links introduced

### WS2 - Entity Linkage Enrichment (Characters/Factions)
Goal: enrich events with context entities while minimizing false links.

#### WS2.1 Build matching dictionary
- Build normalized dictionaries:
  - Character name -> character id
  - Faction name -> faction id
  - Synonym/alias map (for common lore variants)

#### WS2.2 Extract mentions
- Scan event name + chapter/description text for entity mentions.
- Score matches (exact > alias > fuzzy).
- Keep only score above threshold for auto-linking.

#### WS2.3 Guardrails
- Max auto-links per event cap (example: 5 chars, 4 factions).
- Reject ambiguous references unless single strong candidate.
- Preserve existing manual links.

#### WS2.4 Manual review queue
- Emit low-confidence candidates to review list.
- Prioritize high-visibility collections first:
  - GreatWars, WorldOfWarcraft, BurningCrusade, LichKing

#### WS2.5 Deliverables
- data/entity-link-suggestions.json
- data/entity-link-review-queue.json
- ChroniclesDB.json enriched ids

#### WS2 acceptance criteria
- Empty characterIds count reduced by >= 120
- Empty factionIds count reduced by >= 120
- No invalid ids introduced

### WS3 - Editorial Consistency Pass
Goal: preserve readability and chronology consistency after enrichment.

#### WS3.1 Title consistency checks
- Keep concise event names.
- Remove residual malformed punctuation and export artifacts.

#### WS3.2 Date and ordering checks
- Validate yearStart/yearEnd consistency.
- Validate chronological ordering inside collections.

#### WS3.3 Schema compatibility checks
- Ensure chapters/chapterIds/descriptionIds handling stays compatible with app model.

#### WS3.4 Deliverables
- data/editorial-cleanup-report.json
- Validation summary

#### WS3 acceptance criteria
- 0 malformed titles
- 0 invalid year ranges
- 0 timeline value anomalies

## Execution Phases

### Phase A - Prep (0.5 day)
- Freeze baseline metrics snapshot.
- Build source index from local refs and wiki anchors.
- Prepare alias dictionaries for WS1 and WS2.

### Phase B - Canonical links (1-2 days)
- Implement WS1 candidate + validation pipeline.
- Run batch conversion in dry-run then apply mode.
- Produce review queue for unresolved links.

### Phase C - Entity linking (1-2 days)
- Implement WS2 extraction/scoring pipeline.
- Apply high-confidence links automatically.
- Generate manual queue for ambiguous cases.

### Phase D - Quality gate and closeout (0.5 day)
- Run integrity checks and focused tests.
- Produce final optional milestone report.

## Suggested Automation Artifacts
- scripts/optional/normalizeCanonicalLinks.ts
- scripts/optional/enrichEntityLinks.ts
- scripts/optional/validateOptionalQuality.ts
- data/optional/ (reports and review queues)

## Risk Register
- Risk: wrong canonical wiki page chosen.
  - Mitigation: confidence thresholds + unresolved fallback to search links.
- Risk: false positive entity links.
  - Mitigation: conservative matching + cap + review queue.
- Risk: regressions in data schema compatibility.
  - Mitigation: run strict validation scripts and tests after each phase.

## Definition of Done (Optional Milestone)
- Link quality improved with measurable reduction in search links.
- Entity context significantly improved across events.
- No structural or timeline regressions.
- All changes documented in machine-readable reports.

## Immediate Next Step
Start Phase A with a source index build and alias dictionary seed, then run a dry-run for WS1 on GreatWars and WorldOfWarcraft only before expanding to all collections.
