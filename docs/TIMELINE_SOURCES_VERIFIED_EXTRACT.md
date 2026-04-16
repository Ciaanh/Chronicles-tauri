# Timeline Sources Verification and Extract

Date: 2026-04-16

## Scope
This document verifies timeline data available from:
- Online source: https://warcraft.wiki.gg/wiki/Timeline
- Local source set: refs/wow-timelines/LowRoars/Timeline Final/*.md

It also captures current DB baseline metrics relevant to optional follow-up work.

## Verification Results

### 1) Online wiki timeline (verified)
Observed structure confirms broad and deep chronological coverage, including:
- Mythos
- Primordial history
- A New World
- Doom of Draenor
- Great Wars (First War, Second War, Aftermath, Rising Darkness, Third War, Rise of the Lich King)
- World of Warcraft (patch-level sections)
- The Burning Crusade (patch-level sections)
- Wrath of the Lich King (patch-level sections)
- Cataclysm (patch-level sections)
- Mists of Pandaria (patch-level sections)
- Warlords of Draenor (patch-level sections)
- Legion (patch-level sections)
- Battle for Azeroth (patch-level sections)
- Shadowlands (patch-level sections)
- Dragonflight (patch-level sections)
- The War Within (patch-level sections)
- Midnight
- Future
- Notes + References

Additional verification points from page capture:
- The page states date convention based on Dark Portal opening (matching project convention).
- The page includes extensive references/notes for source provenance.
- Captured footer metadata indicates recent edits (last edited 2026-04-07 in captured result).

### 2) Local refs (verified)
Directory: refs/wow-timelines/LowRoars/Timeline Final

Measured local source volume:
- Markdown files: 18
- Total lines: 2120
- Total bullet lines: 1095

Representative era coverage in local files:
- 1. Primordial history.md
- 2. A New World.md
- 3. Doom of Draenor.md
- 4. The Great Wars.md
- 5. World of Warcraft.md
- 6. Burning Crusade.md
- 7. Wrath of The Lich King.md
- 8. Cataclysm.md
- 9. Mists of Pandaria.md
- 10. Warlords of Draenor.md
- 11. Legion.md
- 12. Battle for Azeroth.md
- 13. Shadowlands.md
- 14. Dragonflight.md

Important local caveats:
- Three timestamped variants exist and are NOT byte-identical to their non-timestamp counterparts:
  - 3. Doom of Draenor_1715410600910.md vs 3. Doom of Draenor.md
  - 11. Legion_1715410618628.md vs 11. Legion.md
  - 12. Battle for Azeroth_1715410609934.md vs 12. Battle for Azeroth.md
- refs/wow-timelines/LowRoars/Timeline Final/Timeline/Timeline new.md exists but is empty.

Implication:
- Extraction should treat timestamped and non-timestamped files as potential variants to diff and merge, not auto-discard.

## Quick Extract (planning-focused)

### A) Era/Patch extraction map from wiki (high-value anchors)
- Great Wars: First War, Second War, Aftermath, Rising Darkness, Third War, Rise of the Lich King
- World of Warcraft: 1.1.0, 1.2.0, 1.3.0, 1.4.0, 1.5.0, 1.6.0, 1.7.0, 1.8.0, 1.9.0, 1.11.0, 1.12.0
- Burning Crusade: 2.0.3, 2.1.0, 2.3.0, 2.4.0
- Wrath: 3.0.2, 3.0.3, 3.1.0, 3.2.0, 3.3.0
- Cataclysm: 4.0.3a, 4.1.0, 4.2.0, 4.3.0
- Mists: 5.0.4, 5.1.0, 5.2.0, 5.3.0, 5.4.0
- Warlords: 6.0.2, 6.0.3a, 6.1.0, 6.2.0
- Legion: 7.0.3, 7.1.0, 7.2.0, 7.2.5, 7.3.0, 7.3.5
- BfA: 8.0.1, 8.1.0, 8.1.5, 8.2.0, 8.2.5, 8.3.0
- Shadowlands: 9.1.0, 9.2.0, 9.2.5
- Dragonflight: 10.0.2, 10.0.7, 10.1.0, 10.1.5, 10.1.7, 10.2.0, 10.2.5, 10.2.7
- The War Within: 11.0.2, 11.0.7, 11.1.0, 11.1.5, 11.1.7, 11.2.0, 11.2.5, 11.2.7

### B) Local extraction quality observations
- Local files generally preserve patch/era groupings with bulletized events suitable for parser ingestion.
- Some local files contain wiki-export artifacts such as [edit] markers and inline bracket remnants; extraction should normalize these.
- Some ranges and year markers are compacted or malformed in local text (example in Great Wars file); fallback to wiki anchor links for canonical date cleanup.

## Current DB Baseline (optional-items relevant)
From ChroniclesDB.json snapshot checks:
- EventCount: 321
- EmptyLinks: 0
- SearchLinks (Special:Search): 320
- WikiDirectLinks: 0
- NoCharacterRefs: 234 events
- NoFactionRefs: 233 events
- CharacterCount: 88
- FactionCount: 66

Interpretation:
- Link completeness is good, but canonicality is low (almost all are search links).
- Entity-linking depth is still low for many events, matching known optional follow-up work.

## Recommended Extraction Approach
1. Build a normalized source index from local files first (fast and deterministic).
2. Reconcile timestamped variant files against canonical names using heading+year keys.
3. Resolve unresolved or noisy items against wiki timeline anchors.
4. Emit a curated extraction dataset with provenance fields:
   - sourceType: local|wiki
   - sourceFile or sourceUrl
   - sourceHeading
   - sourcePatch
   - confidence: high|medium|low
5. Use that dataset as input for canonical link and entity-link optional passes.
