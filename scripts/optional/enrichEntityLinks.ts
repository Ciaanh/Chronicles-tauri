/**
 * enrichEntityLinks.ts (WS2)
 *
 * Workstream 2: Entity Linkage Enrichment (Characters/Factions)
 * Goal: Enrich events with context entities while minimizing false links.
 *
 * Process:
 * 1. Load entity dictionaries (characters + factions) from ChroniclesDB
 * 2. Build normalized matching dictionaries with name variants
 * 3. Scan event names for entity mentions
 * 4. Score matches (exact full name = high, stripped parenthetical = medium)
 * 5. Apply high-confidence auto-links
 * 6. Generate review queue for max-exceeded candidates
 *
 * Guardrails:
 *   - Max 5 characters per event
 *   - Max 4 factions per event
 *   - Preserve existing manual links
 *   - Word-boundary matching to prevent partial matches
 *
 * Usage:
 *   npx tsx enrichEntityLinks.ts                  (dry-run, all collections)
 *   npx tsx enrichEntityLinks.ts --collection=GreatWars
 *   npx tsx enrichEntityLinks.ts --apply
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "../..");
const DB_PATH = path.join(ROOT, "ChroniclesDB.json");
const BACKUP_PATH = path.join(ROOT, "data/optional/ChroniclesDB.backup.json");
const REPORT_PATH = path.join(ROOT, "data/optional/entity-enrichment-report.json");

const MAX_CHARS_PER_EVENT = 5;
const MAX_FACS_PER_EVENT = 4;

interface EntityMatch {
  eventId: number;
  eventName: string;
  entityType: "character" | "faction";
  entityName: string;
  entityId: number;
  matchScore: number;
  matchType: "exact" | "alias";
  confidence: "high" | "medium";
  variant: string;
}

interface EntityEnrichmentReport {
  timestamp: string;
  mode: string;
  filter: string;
  scanned: number;
  charsLinked: number;
  facsLinked: number;
  skippedMaxChar: number;
  skippedMaxFac: number;
  autoLinked: EntityMatch[];
  reviewQueue: EntityMatch[];
}

interface EntityEntry {
  id: number;
  name: string;
  type: "character" | "faction";
  variants: string[];
  regexes: RegExp[];
}

// Build name variants: full name + strip trailing parenthetical qualifier
function nameVariants(name: string): string[] {
  const variants: string[] = [name];
  const stripped = name.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (stripped && stripped !== name) variants.push(stripped);
  return variants;
}

// Build a regex that matches the name as a standalone word/phrase.
// Uses lookahead/lookbehind instead of \b to correctly handle apostrophes in names.
function makeMatchRegex(name: string): RegExp {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-zA-Z'])${escaped}(?![a-zA-Z'])`, "i");
}

async function enrichEntityLinks(options: {
  apply: boolean;
  collection: string | null;
}): Promise<void> {
  const mode = options.apply ? "APPLY" : "DRY-RUN";
  const filter = options.collection ?? "all collections";

  console.log(`\nWS2: Entity Linkage Enrichment`);
  console.log(`  Mode   : ${mode}`);
  console.log(`  Filter : ${filter}\n`);

  const db = JSON.parse(readFileSync(DB_PATH, "utf-8"));
  const characters: Array<{ id: number; name: string }> = db.characters;
  const factions: Array<{ id: number; name: string }> = db.factions;
  const events: Array<{
    id: number;
    name: string;
    collectionId: number;
    characterIds: number[];
    factionIds: number[];
  }> = db.events;

  // Build entity entries with name variants and compiled regexes
  const charEntries: EntityEntry[] = characters.map((c) => {
    const variants = nameVariants(c.name);
    return {
      id: c.id,
      name: c.name,
      type: "character",
      variants,
      regexes: variants.map(makeMatchRegex),
    };
  });
  const facEntries: EntityEntry[] = factions.map((f) => {
    const variants = nameVariants(f.name);
    return {
      id: f.id,
      name: f.name,
      type: "faction",
      variants,
      regexes: variants.map(makeMatchRegex),
    };
  });

  // Resolve collection filter
  let collectionIds: Set<number> | null = null;
  if (options.collection) {
    const col = db.collections?.find(
      (c: { id: number; name: string }) =>
        c.name.toLowerCase() === options.collection!.toLowerCase()
    );
    if (!col) {
      console.error(`  ERROR: Collection "${options.collection}" not found.`);
      process.exit(1);
    }
    collectionIds = new Set([col.id]);
  }

  const targetEvents = collectionIds
    ? events.filter((e) => collectionIds!.has(e.collectionId))
    : events;

  console.log(`  Events to process: ${targetEvents.length}\n`);

  const autoLinked: EntityMatch[] = [];
  const reviewQueue: EntityMatch[] = [];
  let skippedMaxChar = 0;
  let skippedMaxFac = 0;

  const pendingChars = new Map<number, number[]>();
  const pendingFacs = new Map<number, number[]>();

  for (let i = 0; i < targetEvents.length; i++) {
    const event = targetEvents[i];
    const label = `[${i + 1}/${targetEvents.length}] ${event.name.substring(0, 60).padEnd(62)}`;
    const eventText = event.name;

    const existingChars = new Set(event.characterIds);
    const existingFacs = new Set(event.factionIds);
    const addedChars: number[] = [];
    const addedFacs: number[] = [];

    // Match characters
    for (const entry of charEntries) {
      if (existingChars.has(entry.id)) continue;
      for (let vi = 0; vi < entry.variants.length; vi++) {
        if (entry.regexes[vi].test(eventText)) {
          const variant = entry.variants[vi];
          const confidence: "high" | "medium" = vi === 0 ? "high" : "medium";
          const score = vi === 0 ? 100 : 80;
          if (existingChars.size + addedChars.length >= MAX_CHARS_PER_EVENT) {
            reviewQueue.push({ eventId: event.id, eventName: event.name, entityType: "character", entityName: entry.name, entityId: entry.id, matchScore: score, matchType: "exact", confidence, variant });
            skippedMaxChar++;
          } else {
            addedChars.push(entry.id);
            autoLinked.push({ eventId: event.id, eventName: event.name, entityType: "character", entityName: entry.name, entityId: entry.id, matchScore: score, matchType: "exact", confidence, variant });
          }
          break;
        }
      }
    }

    // Match factions
    for (const entry of facEntries) {
      if (existingFacs.has(entry.id)) continue;
      for (let vi = 0; vi < entry.variants.length; vi++) {
        if (entry.regexes[vi].test(eventText)) {
          const variant = entry.variants[vi];
          const confidence: "high" | "medium" = vi === 0 ? "high" : "medium";
          const score = vi === 0 ? 100 : 80;
          if (existingFacs.size + addedFacs.length >= MAX_FACS_PER_EVENT) {
            reviewQueue.push({ eventId: event.id, eventName: event.name, entityType: "faction", entityName: entry.name, entityId: entry.id, matchScore: score, matchType: "exact", confidence, variant });
            skippedMaxFac++;
          } else {
            addedFacs.push(entry.id);
            autoLinked.push({ eventId: event.id, eventName: event.name, entityType: "faction", entityName: entry.name, entityId: entry.id, matchScore: score, matchType: "exact", confidence, variant });
          }
          break;
        }
      }
    }

    if (addedChars.length > 0 || addedFacs.length > 0) {
      const parts: string[] = [];
      if (addedChars.length > 0) parts.push(`+${addedChars.length} char(s)`);
      if (addedFacs.length > 0) parts.push(`+${addedFacs.length} faction(s)`);
      console.log(`  ${label}→ ${parts.join(", ")}`);
    }

    if (addedChars.length > 0) pendingChars.set(event.id, addedChars);
    if (addedFacs.length > 0) pendingFacs.set(event.id, addedFacs);
  }

  const totalCharsLinked = autoLinked.filter((m) => m.entityType === "character").length;
  const totalFacsLinked = autoLinked.filter((m) => m.entityType === "faction").length;
  const eventsAffected = new Set([...pendingChars.keys(), ...pendingFacs.keys()]).size;

  console.log(`\nSummary`);
  console.log(`-------`);
  console.log(`  Scanned        : ${targetEvents.length}`);
  console.log(`  Events affected: ${eventsAffected}`);
  console.log(`  Chars linked   : ${totalCharsLinked}`);
  console.log(`  Facs linked    : ${totalFacsLinked}`);
  console.log(`  Review queue   : ${reviewQueue.length} (exceeded max per event)`);

  const report: EntityEnrichmentReport = {
    timestamp: new Date().toISOString(),
    mode,
    filter,
    scanned: targetEvents.length,
    charsLinked: totalCharsLinked,
    facsLinked: totalFacsLinked,
    skippedMaxChar,
    skippedMaxFac,
    autoLinked,
    reviewQueue,
  };

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\n  Report     : ${REPORT_PATH}`);

  if (options.apply) {
    if (pendingChars.size === 0 && pendingFacs.size === 0) {
      console.log(`  No changes to apply.`);
      return;
    }
    if (!existsSync(BACKUP_PATH)) {
      writeFileSync(BACKUP_PATH, JSON.stringify(db, null, 2), "utf-8");
      console.log(`  Backup written: ${BACKUP_PATH}`);
    }
    let eventCount = 0;
    for (const event of db.events) {
      const chars = pendingChars.get(event.id);
      const facs = pendingFacs.get(event.id);
      let changed = false;
      if (chars) { event.characterIds = [...event.characterIds, ...chars]; changed = true; }
      if (facs) { event.factionIds = [...event.factionIds, ...facs]; changed = true; }
      if (changed) eventCount++;
    }
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    console.log(`  ChroniclesDB.json updated: ${eventCount} events enriched`);
    console.log(`  Changes applied to ChroniclesDB.json`);
  } else {
    console.log(`  (dry-run — no changes written)`);
  }
}

// CLI
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const collectionArg = args.find((a) => a.startsWith("--collection="))?.split("=")[1] ?? null;

enrichEntityLinks({ apply, collection: collectionArg }).catch(console.error);
