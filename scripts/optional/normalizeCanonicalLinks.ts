/**
 * normalizeCanonicalLinks.ts (WS1)
 *
 * Workstream 1: Canonical Link Normalization
 * Converts Special:Search links to verified canonical article links.
 *
 * Process:
 * 1. Load DB + normalization dictionary
 * 2. For each event with a search link:
 *    a. Check normalization dictionary first (no HTTP needed)
 *    b. Generate slug candidates from event name (apostrophe variants, etc.)
 *    c. HTTP-verify each candidate against warcraft.wiki.gg — follow redirects,
 *       reject if final URL still contains Special:Search
 *    d. High-confidence match → update (or record for dry-run)
 *    e. No verified candidate → add to review queue
 * 3. Write report + optionally write updated ChroniclesDB.json
 *
 * Usage:
 *   npx tsx scripts/optional/normalizeCanonicalLinks.ts --dry-run
 *   npx tsx scripts/optional/normalizeCanonicalLinks.ts --collection GreatWars --dry-run
 *   npx tsx scripts/optional/normalizeCanonicalLinks.ts --apply
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

// ── Types ─────────────────────────────────────────────────────────────────────

interface EventRecord {
  id: number;
  name: string;
  link: string;
  collectionId: number;
  [key: string]: unknown;
}

interface CollectionRecord {
  id: number;
  name: string;
}

interface DB {
  events: EventRecord[];
  collections: CollectionRecord[];
  [key: string]: unknown;
}

interface ArticleEntry {
  canonical: string;
  aliases: string[];
  wikiUrl?: string;
}

interface NormalizationDictionary {
  entries: Record<string, ArticleEntry>;
}

interface LinkResult {
  eventId: number;
  eventName: string;
  collectionId: number;
  originalLink: string;
  resolvedLink: string;
  method: "dictionary" | "slug-verified" | "unresolved";
  confidence: "high" | "medium" | "low";
  note?: string;
}

interface NormalizationReport {
  timestamp: string;
  options: { dryRun: boolean; collection: string | undefined };
  metrics: {
    eventsScanned: number;
    resolvedViaDict: number;
    resolvedViaHttp: number;
    unresolved: number;
    unchanged: number;
  };
  resolved: LinkResult[];
  reviewQueue: LinkResult[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WIKI_BASE = "https://warcraft.wiki.gg/wiki/";
const SEARCH_MARKER = "Special:Search";
const REQUEST_DELAY_MS = 400; // polite rate limit between HTTP requests

// ── Slug generation ───────────────────────────────────────────────────────────

/**
 * Generate ordered candidate slugs for a given event name.
 * We try the most likely forms first to minimize HTTP round-trips.
 * For compound names (containing "/", "and", or long descriptions)
 * we also try each sub-clause as a standalone candidate.
 */
function generateCandidateSlugs(name: string): string[] {
  const allCandidates: string[] = [];

  // Build candidates for a single phrase
  function phraseCandidates(phrase: string): string[] {
    const base = phrase.trim().replace(/\s+/g, " ");
    if (base.length < 3) return [];

    const candidates: string[] = [];

    // Direct: spaces → underscores
    const direct = base.replace(/ /g, "_");
    candidates.push(direct);

    // Title-case
    const titleCase = base
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("_");
    if (titleCase !== direct) candidates.push(titleCase);

    // Strip leading "The "
    if (/^The /i.test(base)) {
      candidates.push(base.replace(/^The /i, "").replace(/ /g, "_"));
    }

    // Normalize curly apostrophes → straight
    const normalized = base.replace(/[\u2018\u2019\u02bc]/g, "'").replace(/ /g, "_");
    if (normalized !== direct) candidates.push(normalized);

    // Strip all punctuation except alphanumerics, spaces, apostrophes
    const stripped = base.replace(/[^\w\s']/g, "").replace(/ /g, "_");
    if (stripped !== direct && stripped !== normalized) candidates.push(stripped);

    return [...new Set(candidates)];
  }

  const base = name.trim().replace(/\s+/g, " ");

  // Primary: full name candidates first
  allCandidates.push(...phraseCandidates(base));

  // Secondary: split compound names on "/" or " - " and try each clause
  const parts = base.split(/\s*\/\s*|\s+[-–—]\s+/);
  if (parts.length > 1) {
    for (const part of parts) {
      allCandidates.push(...phraseCandidates(part.trim()));
    }
  }

  // Deduplicate while preserving priority order
  return [...new Set(allCandidates)];
}

function slugToUrl(slug: string): string {
  // Encode everything except underscores and a-z A-Z 0-9 and a small safe set
  const encoded = slug
    .split("")
    .map((c) => {
      if (/[A-Za-z0-9_\-.()'!]/.test(c)) return c;
      return encodeURIComponent(c);
    })
    .join("");
  return WIKI_BASE + encoded;
}

// ── HTTP verification ──────────────────────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks whether a wiki URL resolves to a real article page.
 * Returns the final resolved URL if the article exists, or null if it landed
 * on Special:Search (article not found) or returned a non-OK status.
 */
async function verifyWikiUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Chronicles-tauri/1.0 (link normalization tool; non-commercial research)",
      },
    });

    if (!response.ok) return null;

    // After redirects, check if we ended up on a search results page
    const finalUrl = response.url;
    if (finalUrl.includes(SEARCH_MARKER)) return null;

    // A brief HTML check: wiki article pages include the article title in the page heading
    // We do NOT parse HTML fully — we just confirm it's not a "no results" search page
    const html = await response.text();
    if (html.includes('class="mw-search-results"') || html.includes("There were no results")) {
      return null;
    }

    return finalUrl;
  } catch {
    return null;
  }
}

// ── Dictionary lookup ──────────────────────────────────────────────────────────

function lookupInDictionary(
  eventName: string,
  dict: NormalizationDictionary
): string | null {
  const entries = dict.entries;

  // Direct match
  if (entries[eventName]?.wikiUrl) return entries[eventName].wikiUrl!;

  // Alias match
  for (const entry of Object.values(entries)) {
    if (entry.wikiUrl && entry.aliases.some((a) => a.toLowerCase() === eventName.toLowerCase())) {
      return entry.wikiUrl;
    }
  }

  // Case-insensitive name match
  const lower = eventName.toLowerCase();
  for (const [key, entry] of Object.entries(entries)) {
    if (key.toLowerCase() === lower && entry.wikiUrl) return entry.wikiUrl;
  }

  return null;
}

// ── Main logic ─────────────────────────────────────────────────────────────────

interface Options {
  dryRun: boolean;
  collection: string | undefined;
  apply: boolean;
}

async function normalizeCanonicalLinks(options: Options): Promise<void> {
  console.log("WS1: Canonical Link Normalization");
  console.log(`  Mode   : ${options.dryRun ? "DRY RUN (no writes)" : options.apply ? "APPLY" : "DRY RUN"}`);
  console.log(`  Filter : ${options.collection ?? "all collections"}`);
  console.log("");

  // Load DB
  const dbPath = path.join(ROOT, "ChroniclesDB.json");
  const db: DB = JSON.parse(readFileSync(dbPath, "utf-8"));

  // Load normalization dictionary
  const dictPath = path.join(ROOT, "data/optional/normalization-dictionary.json");
  const dict: NormalizationDictionary = existsSync(dictPath)
    ? JSON.parse(readFileSync(dictPath, "utf-8"))
    : { entries: {} };

  // Resolve collection filter
  let collectionIdFilter: number | undefined;
  if (options.collection) {
    const col = db.collections.find(
      (c) => c.name.toLowerCase() === options.collection!.toLowerCase()
    );
    if (!col) {
      console.error(`Collection not found: "${options.collection}"`);
      console.log("Available collections:", db.collections.map((c) => c.name).join(", "));
      process.exit(1);
    }
    collectionIdFilter = col.id;
    console.log(`  Collection "${col.name}" (id=${col.id}) — ${db.events.filter((e) => e.collectionId === col.id).length} events`);
  }

  // Select events to process: only those still using Special:Search
  const candidates = db.events.filter((e) => {
    if (!e.link.includes(SEARCH_MARKER)) return false;
    if (collectionIdFilter !== undefined && e.collectionId !== collectionIdFilter) return false;
    return true;
  });

  console.log(`  Events to process: ${candidates.length}`);
  console.log("");

  const resolved: LinkResult[] = [];
  const reviewQueue: LinkResult[] = [];
  const metrics = {
    eventsScanned: candidates.length,
    resolvedViaDict: 0,
    resolvedViaHttp: 0,
    unresolved: 0,
    unchanged: 0,
  };

  for (let i = 0; i < candidates.length; i++) {
    const event = candidates[i];
    process.stdout.write(`  [${i + 1}/${candidates.length}] ${event.name.substring(0, 60).padEnd(60)} `);

    // Step 1: Dictionary lookup (free, no HTTP)
    const dictUrl = lookupInDictionary(event.name, dict);
    if (dictUrl) {
      process.stdout.write(`→ dict\n`);
      resolved.push({
        eventId: event.id,
        eventName: event.name,
        collectionId: event.collectionId,
        originalLink: event.link,
        resolvedLink: dictUrl,
        method: "dictionary",
        confidence: "high",
      });
      metrics.resolvedViaDict++;
      continue;
    }

    // Step 2: HTTP verification of slug candidates
    const slugs = generateCandidateSlugs(event.name);
    let verified: string | null = null;
    let usedSlug: string | undefined;

    for (const slug of slugs) {
      const candidateUrl = slugToUrl(slug);
      await sleep(REQUEST_DELAY_MS);
      const result = await verifyWikiUrl(candidateUrl);
      if (result) {
        verified = result;
        usedSlug = slug;
        break;
      }
    }

    if (verified) {
      process.stdout.write(`→ verified (${usedSlug})\n`);
      resolved.push({
        eventId: event.id,
        eventName: event.name,
        collectionId: event.collectionId,
        originalLink: event.link,
        resolvedLink: verified,
        method: "slug-verified",
        confidence: event.name.replace(/ /g, "_") === usedSlug ? "high" : "medium",
        note: `Verified slug: ${usedSlug}`,
      });
      metrics.resolvedViaHttp++;
    } else {
      process.stdout.write(`→ unresolved\n`);
      reviewQueue.push({
        eventId: event.id,
        eventName: event.name,
        collectionId: event.collectionId,
        originalLink: event.link,
        resolvedLink: event.link, // keep original
        method: "unresolved",
        confidence: "low",
        note: `Tried slugs: ${slugs.join(", ")}`,
      });
      metrics.unresolved++;
    }
  }

  // Build report
  const report: NormalizationReport = {
    timestamp: new Date().toISOString(),
    options: { dryRun: options.dryRun || !options.apply, collection: options.collection },
    metrics,
    resolved,
    reviewQueue,
  };

  // Write report
  const reportPath = path.join(ROOT, "data/optional/link-normalization-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

  // Apply to DB if requested
  if (options.apply && !options.dryRun) {
    // Backup original
    const backupPath = path.join(ROOT, "data/optional/ChroniclesDB.backup.json");
    if (!existsSync(backupPath)) {
      writeFileSync(backupPath, JSON.stringify(db, null, 2), "utf-8");
      console.log(`\n  Backup written: ${backupPath}`);
    }

    // Apply resolved links
    const eventMap = new Map(db.events.map((e) => [e.id, e]));
    for (const result of resolved) {
      const ev = eventMap.get(result.eventId);
      if (ev) ev.link = result.resolvedLink;
    }

    writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");
    console.log(`  ChroniclesDB.json updated: ${resolved.length} links replaced`);
  }

  // Summary
  console.log(`
Summary
-------
  Scanned    : ${metrics.eventsScanned}
  Dict match : ${metrics.resolvedViaDict}
  HTTP match : ${metrics.resolvedViaHttp}
  Unresolved : ${metrics.unresolved}
  Total fixed: ${metrics.resolvedViaDict + metrics.resolvedViaHttp}

  Report     : ${reportPath}
  ${options.apply ? "Changes applied to ChroniclesDB.json" : "DRY RUN — no changes written to DB"}
  `);
}

// ── CLI entry point ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);

const collectionArg = args.find((a) => a.startsWith("--collection="))?.split("=")[1]
  ?? args[args.indexOf("--collection") + 1] ?? undefined;

// If --collection is a flag key, make sure we didn't pick up a different flag
const resolvedCollection =
  collectionArg?.startsWith("--") ? undefined : collectionArg;

const options: Options = {
  dryRun: !args.includes("--apply"),
  collection: resolvedCollection,
  apply: args.includes("--apply"),
};

normalizeCanonicalLinks(options).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
