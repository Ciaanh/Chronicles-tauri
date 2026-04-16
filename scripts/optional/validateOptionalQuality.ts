/**
 * validateOptionalQuality.ts (WS3)
 * 
 * Workstream 3: Editorial Consistency Pass & Quality Gate
 * Goal: Ensure data integrity and readability after enrichment.
 * 
 * Validation checks:
 * 1. Title consistency:
 *    - No residual malformed punctuation
 *    - No export artifacts
 *    - Reasonable length
 * 
 * 2. Date and ordering:
 *    - yearStart <= yearEnd
 *    - Chronological ordering inside collections
 *    - No year outliers
 * 
 * 3. Schema compatibility:
 *    - chapters/chapterIds consistency
 *    - descriptionIds validity
 *    - Character/faction ID references exist
 *    - No type mismatches
 * 
 * Usage:
 *   npx ts-node validateOptionalQuality.ts [--baseline] [--regression]
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "../..");
const DB_PATH = path.join(ROOT, "ChroniclesDB.json");
const DEFAULT_BASELINE_PATH = path.join(ROOT, "data/optional/baseline-snapshot.json");
const REPORT_PATH = path.join(ROOT, "data/optional/editorial-cleanup-report.json");

interface ValidationCheck {
  name: string;
  passed: boolean;
  issues: string[];
  affectedCount: number;
}

interface ValidationReport {
  timestamp: string;
  compareTo?: string;
  checks: ValidationCheck[];
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    issueCount: number;
  };
  regressionDetected: boolean;
  readyForProduction: boolean;
}

function readJSON(filePath: string) {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function addIssue(issues: string[], msg: string, cap = 200): void {
  if (issues.length < cap) {
    issues.push(msg);
  }
}

function makeCheck(name: string, issues: string[]): ValidationCheck {
  return {
    name,
    passed: issues.length === 0,
    issues,
    affectedCount: issues.length,
  };
}

function validateChapterBlocks(
  eventId: number,
  chapterBlocks: any[],
  localeIds: Set<number>,
  issues: string[]
): void {
  for (const block of chapterBlocks) {
    if (typeof block !== "object" || block === null || Array.isArray(block)) {
      addIssue(issues, `Event #${eventId}: invalid chapter block type`);
      continue;
    }

    const headerId = block.headerId;
    if (headerId !== null && headerId !== undefined) {
      if (!isNumber(headerId) || !localeIds.has(headerId)) {
        addIssue(issues, `Event #${eventId}: invalid chapter.headerId ${String(headerId)}`);
      }
    }

    const pageIds = block.pageIds;
    if (!Array.isArray(pageIds)) {
      addIssue(issues, `Event #${eventId}: chapter.pageIds is not an array`);
      continue;
    }
    for (const pid of pageIds) {
      if (!isNumber(pid) || !localeIds.has(pid)) {
        addIssue(issues, `Event #${eventId}: invalid chapter.pageId ${String(pid)}`);
      }
    }
  }
}

async function validateOptionalQuality(options: {
  baseline?: string;
  regression?: boolean;
}): Promise<void> {
  const compareTo = options.baseline || (existsSync(DEFAULT_BASELINE_PATH) ? DEFAULT_BASELINE_PATH : undefined);

  console.log("\nWS3: Editorial Consistency & Quality Gate");
  console.log(`  Baseline : ${compareTo ?? "none"}`);
  console.log(`  Regression check: ${Boolean(options.regression || compareTo)}\n`);

  const db = readJSON(DB_PATH);
  const events: Array<any> = db.events ?? [];
  const characters: Array<any> = db.characters ?? [];
  const factions: Array<any> = db.factions ?? [];
  const chapters: Array<any> = db.chapters ?? [];
  const locales: Array<any> = db.locales ?? [];
  const collections: Array<any> = db.collections ?? [];

  const characterIds = new Set<number>(characters.map((c) => c.id));
  const factionIds = new Set<number>(factions.map((f) => f.id));
  const chapterIds = new Set<number>(chapters.map((c) => c.id));
  const localeIds = new Set<number>(locales.map((l) => l.id));
  const collectionIds = new Set<number>(collections.map((c) => c.id));

  const checks: ValidationCheck[] = [];

  // 1) Title consistency
  const titleIssues: string[] = [];
  const artifactRegex = /\[edit\]|&nbsp;|__TOC__|\{\{[^}]+\}\}/i;
  const malformedPunctuationRegex = /\s{2,}|\s+[.,;:!?]|[.,;:!?]{2,}/;
  for (const e of events) {
    const name = e?.name;
    if (typeof name !== "string") {
      addIssue(titleIssues, `Event #${e?.id ?? "?"}: name is not a string`);
      continue;
    }
    const trimmed = name.trim();
    if (trimmed.length < 5 || trimmed.length > 200) {
      addIssue(titleIssues, `Event #${e.id}: title length out of range (${trimmed.length})`);
    }
    if (artifactRegex.test(trimmed)) {
      addIssue(titleIssues, `Event #${e.id}: export artifact in title: "${trimmed}"`);
    }
    if (malformedPunctuationRegex.test(trimmed)) {
      addIssue(titleIssues, `Event #${e.id}: malformed punctuation/spacing in title: "${trimmed}"`);
    }
  }
  checks.push(makeCheck("Title consistency", titleIssues));

  // 2) Date & ordering
  const dateIssues: string[] = [];
  for (const e of events) {
    if (!isNumber(e.yearStart) || !isNumber(e.yearEnd)) {
      addIssue(dateIssues, `Event #${e.id}: invalid year type(s) yearStart=${e.yearStart}, yearEnd=${e.yearEnd}`);
      continue;
    }
    if (e.yearStart > e.yearEnd) {
      addIssue(dateIssues, `Event #${e.id}: yearStart (${e.yearStart}) > yearEnd (${e.yearEnd})`);
    }
    if (e.yearStart < -1000000 || e.yearEnd > 3000) {
      addIssue(dateIssues, `Event #${e.id}: year outlier [${e.yearStart}, ${e.yearEnd}]`);
    }
  }
  const byCollection = new Map<number, any[]>();
  for (const e of events) {
    const list = byCollection.get(e.collectionId) ?? [];
    list.push(e);
    byCollection.set(e.collectionId, list);
  }
  for (const [collectionId, list] of byCollection.entries()) {
    const sorted = [...list].sort((a, b) => {
      const ao = isNumber(a.order) ? a.order : Number.MAX_SAFE_INTEGER;
      const bo = isNumber(b.order) ? b.order : Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.id - b.id;
    });
    let prev: any | null = null;
    for (const curr of sorted) {
      if (prev && isNumber(prev.yearStart) && isNumber(curr.yearStart) && curr.yearStart < prev.yearStart) {
        addIssue(
          dateIssues,
          `Collection #${collectionId}: non-chronological order between event #${prev.id} (${prev.yearStart}) and #${curr.id} (${curr.yearStart})`
        );
      }
      prev = curr;
    }
  }
  checks.push(makeCheck("Date and ordering", dateIssues));

  // 3) Schema compatibility
  const schemaIssues: string[] = [];
  const uniqueCheck = (name: string, values: number[]) => {
    const seen = new Set<number>();
    for (const v of values) {
      if (!isNumber(v)) {
        addIssue(schemaIssues, `${name}: non-numeric id encountered (${String(v)})`);
        continue;
      }
      if (seen.has(v)) {
        addIssue(schemaIssues, `${name}: duplicate id ${v}`);
      }
      seen.add(v);
    }
  };
  uniqueCheck("events", events.map((e) => e.id));
  uniqueCheck("characters", characters.map((c) => c.id));
  uniqueCheck("factions", factions.map((f) => f.id));
  uniqueCheck("chapters", chapters.map((c) => c.id));
  uniqueCheck("locales", locales.map((l) => l.id));
  uniqueCheck("collections", collections.map((c) => c.id));

  for (const e of events) {
    if (!Array.isArray(e.characterIds)) addIssue(schemaIssues, `Event #${e.id}: characterIds is not an array`);
    if (!Array.isArray(e.factionIds)) addIssue(schemaIssues, `Event #${e.id}: factionIds is not an array`);
    const hasChapterIds = Array.isArray(e.chapterIds);
    const hasChapters = Array.isArray(e.chapters);
    if (!hasChapterIds && !hasChapters) {
      addIssue(schemaIssues, `Event #${e.id}: missing both chapterIds and chapters arrays`);
    }
    if (!isNumber(e.labelId)) addIssue(schemaIssues, `Event #${e.id}: labelId is not numeric`);
    if (!isNumber(e.collectionId)) addIssue(schemaIssues, `Event #${e.id}: collectionId is not numeric`);
    if (isNumber(e.labelId) && !localeIds.has(e.labelId)) {
      addIssue(schemaIssues, `Event #${e.id}: labelId ${e.labelId} does not exist in locales`);
    }
    if (isNumber(e.collectionId) && !collectionIds.has(e.collectionId)) {
      addIssue(schemaIssues, `Event #${e.id}: collectionId ${e.collectionId} does not exist in collections`);
    }
    if (hasChapterIds) {
      const chapterArray = e.chapterIds as any[];
      const allNumeric = chapterArray.every((x) => isNumber(x));
      const allObjects = chapterArray.every((x) => typeof x === "object" && x !== null && !Array.isArray(x));
      if (allNumeric) {
        for (const cid of chapterArray) {
          if (!chapterIds.has(cid)) {
            addIssue(schemaIssues, `Event #${e.id}: invalid chapterId ${String(cid)}`);
          }
        }
      } else if (allObjects) {
        // Legacy shape exists in some records under chapterIds key
        validateChapterBlocks(e.id, chapterArray, localeIds, schemaIssues);
      } else {
        addIssue(schemaIssues, `Event #${e.id}: mixed/invalid chapterIds entry types`);
      }
    }

    if (hasChapters) {
      validateChapterBlocks(e.id, e.chapters, localeIds, schemaIssues);
    }

    if (e.descriptionIds !== undefined && !Array.isArray(e.descriptionIds)) {
      addIssue(schemaIssues, `Event #${e.id}: descriptionIds is not an array`);
    }
    if (Array.isArray(e.descriptionIds)) {
      for (const did of e.descriptionIds) {
        if (!isNumber(did) || !localeIds.has(did)) {
          addIssue(schemaIssues, `Event #${e.id}: invalid descriptionId ${String(did)}`);
        }
      }
    }
  }
  checks.push(makeCheck("Schema compatibility", schemaIssues));

  // 4) Entity references
  const entityRefIssues: string[] = [];
  for (const e of events) {
    if (Array.isArray(e.characterIds)) {
      for (const id of e.characterIds) {
        if (!isNumber(id) || !characterIds.has(id)) {
          addIssue(entityRefIssues, `Event #${e.id}: invalid characterId ${String(id)}`);
        }
      }
    }
    if (Array.isArray(e.factionIds)) {
      for (const id of e.factionIds) {
        if (!isNumber(id) || !factionIds.has(id)) {
          addIssue(entityRefIssues, `Event #${e.id}: invalid factionId ${String(id)}`);
        }
      }
    }
  }
  checks.push(makeCheck("Entity reference integrity", entityRefIssues));

  // 5) Link quality
  const linkIssues: string[] = [];
  let searchLinks = 0;
  let directLinks = 0;
  let preferredDomainLinks = 0;
  let nonPreferredDomainLinks = 0;
  for (const e of events) {
    const link = e.link;
    if (typeof link !== "string" || link.trim().length === 0) {
      addIssue(linkIssues, `Event #${e.id}: missing or non-string link`);
      continue;
    }
    if (!/^https?:\/\//i.test(link)) {
      addIssue(linkIssues, `Event #${e.id}: non-http link: ${link}`);
    }
    if (/Special:Search/i.test(link)) searchLinks++;
    else directLinks++;
    if (/^https:\/\/warcraft\.wiki\.gg\/wiki\//i.test(link)) preferredDomainLinks++;
    else nonPreferredDomainLinks++;
  }
  checks.push(makeCheck("Link quality", linkIssues));

  // 6) Regression check (optional)
  let regressionDetected = false;
  if (options.regression || compareTo) {
    const regressionIssues: string[] = [];
    if (!compareTo || !existsSync(compareTo)) {
      addIssue(regressionIssues, "Baseline file not found for regression check");
    } else {
      const baselineRaw = readJSON(compareTo);
      const baseline = baselineRaw.Baseline ?? baselineRaw;

      const baselineEventCount = baseline.EventCount ?? baseline.eventCount;
      const baselineCharCount = baseline.CharacterCount ?? baseline.characterCount;
      const baselineFactionCount = baseline.FactionCount ?? baseline.factionCount;
      const baselineSearchLinks = baseline.SearchLinks ?? baseline.searchLinks;
      const baselineNoChar = baseline.NoCharacterRefs ?? baseline.noCharacterRefs;
      const baselineNoFac = baseline.NoFactionRefs ?? baseline.noFactionRefs;

      const currentNoChar = events.filter((e) => Array.isArray(e.characterIds) && e.characterIds.length === 0).length;
      const currentNoFac = events.filter((e) => Array.isArray(e.factionIds) && e.factionIds.length === 0).length;

      if (isNumber(baselineEventCount) && events.length !== baselineEventCount) {
        addIssue(regressionIssues, `EventCount changed: baseline=${baselineEventCount}, current=${events.length}`);
      }
      if (isNumber(baselineCharCount) && characters.length !== baselineCharCount) {
        addIssue(regressionIssues, `CharacterCount changed: baseline=${baselineCharCount}, current=${characters.length}`);
      }
      if (isNumber(baselineFactionCount) && factions.length !== baselineFactionCount) {
        addIssue(regressionIssues, `FactionCount changed: baseline=${baselineFactionCount}, current=${factions.length}`);
      }
      if (isNumber(baselineSearchLinks) && searchLinks > baselineSearchLinks) {
        addIssue(regressionIssues, `SearchLinks regression: baseline=${baselineSearchLinks}, current=${searchLinks}`);
      }
      if (isNumber(baselineNoChar) && currentNoChar > baselineNoChar) {
        addIssue(regressionIssues, `NoCharacterRefs regression: baseline=${baselineNoChar}, current=${currentNoChar}`);
      }
      if (isNumber(baselineNoFac) && currentNoFac > baselineNoFac) {
        addIssue(regressionIssues, `NoFactionRefs regression: baseline=${baselineNoFac}, current=${currentNoFac}`);
      }
    }
    const regressionCheck = makeCheck("Regression detection", regressionIssues);
    checks.push(regressionCheck);
    regressionDetected = !regressionCheck.passed;
  }

  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.length - passed;
  const issueCount = checks.reduce((sum, c) => sum + c.affectedCount, 0);

  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    compareTo,
    checks,
    summary: {
      totalChecks: checks.length,
      passed,
      failed,
      issueCount,
    },
    regressionDetected,
    readyForProduction: failed === 0,
  };

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf-8");

  console.log("Summary");
  console.log("-------");
  console.log(`  Checks       : ${checks.length}`);
  console.log(`  Passed       : ${passed}`);
  console.log(`  Failed       : ${failed}`);
  console.log(`  Total issues : ${issueCount}`);
  console.log(`  Search links : ${searchLinks}`);
  console.log(`  Direct links : ${directLinks}`);
  console.log(`  Non-preferred domain links : ${nonPreferredDomainLinks}`);
  console.log(`  Ready        : ${report.readyForProduction}`);
  console.log(`\n  Report       : ${REPORT_PATH}`);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  baseline: args.find((a) => a.startsWith("--baseline="))?.split("=")[1],
  regression: args.includes("--regression"),
};

validateOptionalQuality(options).catch((error) => {
  console.error("Error in WS3:", error);
  process.exit(1);
});
