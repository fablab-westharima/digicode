/**
 * audit-data-consistency.ts
 *
 * Verifies structural consistency between canonical JA data sources and their i18n overrides,
 * and ensures XML samples reference only valid catalog blocks.
 *
 * Scope (Phase 2, 2026-04-24 — BUG-025):
 * - sampleProjects.ts        (canonical JA) ↔ sampleProjectsI18n.ts   (en / es / pt-PT / zh-TW)
 * - tutorials.ts             (canonical JA) ↔ tutorialsI18n.ts        (en / es / pt-PT / zh-TW)
 * - tutorials[].sampleXml    block types    ↔ public/ai/block-catalog.json
 *
 * Errors (exit 1):
 *   [ORPHAN_*]       override id has no canonical counterpart
 *   [EMPTY_*]        override provides empty title / description / step content
 *   [CATALOG_REF]    tutorial.sampleXml references a block not in the catalog
 *
 * Warnings (exit 0):
 *   [COVERAGE_*]     canonical id not translated in a given locale (informational)
 *
 * Run via: npx tsx scripts/audit-data-consistency.ts
 * Auto-run: "prebuild" hook in package.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.join(__dirname, '..');

const SAMPLES_PATH       = path.join(FRONTEND_DIR, 'src/data/sampleProjects.ts');
const SAMPLES_I18N_PATH  = path.join(FRONTEND_DIR, 'src/data/sampleProjectsI18n.ts');
const TUTORIALS_PATH     = path.join(FRONTEND_DIR, 'src/data/tutorials.ts');
const TUTORIALS_I18N_PATH= path.join(FRONTEND_DIR, 'src/data/tutorialsI18n.ts');
const CATALOG_PATH       = path.join(FRONTEND_DIR, 'public/ai/block-catalog.json');

const LOCALES = ['en', 'es', 'pt-PT', 'zh-TW'] as const;
type Locale = typeof LOCALES[number];

// Tutorials whose sampleXml references blocks that no longer exist in the catalog.
// Phase 2 audit surfaced them; they are scheduled for a full rewrite in 37.md (rebuild).
// Their CATALOG_REF issues are demoted to [KNOWN_BROKEN] warnings so the audit can ship
// now without blocking builds. Remove each entry the moment its tutorial is reauthored —
// the audit will then fail on any fresh drift, which is the intended long-term behaviour.
const KNOWN_BROKEN_TUTORIALS = new Set<string>([
  'humanoid-dance',
  'humanoid-touch',
  'humanoid-sound-react',
]);

// ---------------------------------------------------------------------------
// Low-level parsing helpers (regex + balanced-brace scanner)
// ---------------------------------------------------------------------------

function advancePastString(content: string, start: number, quote: string): number {
  let i = start + 1;
  while (i < content.length && content[i] !== quote) {
    if (content[i] === '\\') i += 2;
    else i++;
  }
  return i + 1;
}

function skipCommentOrString(content: string, i: number): number | null {
  const c = content[i];
  if (c === '"' || c === "'" || c === '`') return advancePastString(content, i, c);
  if (c === '/' && content[i + 1] === '/') {
    const nl = content.indexOf('\n', i);
    return nl === -1 ? content.length : nl + 1;
  }
  if (c === '/' && content[i + 1] === '*') {
    const end = content.indexOf('*/', i + 2);
    return end === -1 ? content.length : end + 2;
  }
  return null;
}

function extractBalancedBody(content: string, startIndex: number, open: '{' | '['): { body: string; end: number } | null {
  const close = open === '{' ? '}' : ']';
  if (content[startIndex] !== open) return null;
  let depth = 1;
  let i = startIndex + 1;
  while (i < content.length && depth > 0) {
    const skipped = skipCommentOrString(content, i);
    if (skipped !== null) { i = skipped; continue; }
    const c = content[i];
    if (c === open) { depth++; i++; }
    else if (c === close) { depth--; i++; }
    else i++;
  }
  return { body: content.substring(startIndex + 1, i - 1), end: i };
}

interface ParsedValue {
  key: string;
  kind: 'string' | 'template' | 'object' | 'array' | 'primitive';
  value: string;
}

/**
 * Parse a comma-separated object body into a list of key/value pairs.
 * Nested objects and arrays are returned as raw body strings (without the wrapping braces).
 */
function parseObjectBody(body: string): ParsedValue[] {
  const out: ParsedValue[] = [];
  let i = 0;
  while (i < body.length) {
    // skip whitespace, commas
    while (i < body.length && /[\s,]/.test(body[i])) i++;
    if (i >= body.length) break;
    // skip comments
    if (body.startsWith('//', i)) {
      const nl = body.indexOf('\n', i);
      i = nl === -1 ? body.length : nl + 1;
      continue;
    }
    if (body.startsWith('/*', i)) {
      const end = body.indexOf('*/', i + 2);
      i = end === -1 ? body.length : end + 2;
      continue;
    }
    // key (identifier or quoted)
    const keyM = body.slice(i).match(/^(['"])([\w-]+)\1\s*:\s*|^([\w$][\w$-]*)\s*:\s*/);
    if (!keyM) { i++; continue; }
    const key = keyM[2] ?? keyM[3];
    i += keyM[0].length;
    if (i >= body.length) break;
    const c = body[i];
    if (c === "'" || c === '"') {
      const quote = c;
      let j = i + 1;
      let val = '';
      while (j < body.length && body[j] !== quote) {
        if (body[j] === '\\') { val += body[j + 1] ?? ''; j += 2; }
        else { val += body[j]; j++; }
      }
      out.push({ key, kind: 'string', value: val });
      i = j + 1;
    } else if (c === '`') {
      let j = i + 1;
      while (j < body.length && body[j] !== '`') j++;
      out.push({ key, kind: 'template', value: body.substring(i + 1, j) });
      i = j + 1;
    } else if (c === '{') {
      const obj = extractBalancedBody(body, i, '{');
      if (!obj) break;
      out.push({ key, kind: 'object', value: obj.body });
      i = obj.end;
    } else if (c === '[') {
      const arr = extractBalancedBody(body, i, '[');
      if (!arr) break;
      out.push({ key, kind: 'array', value: arr.body });
      i = arr.end;
    } else {
      const m = body.slice(i).match(/^[^,\}\]]+/);
      if (m) {
        out.push({ key, kind: 'primitive', value: m[0].trim() });
        i += m[0].length;
      } else { i++; }
    }
  }
  return out;
}

function parseArrayOfObjects(arrBody: string): ParsedValue[][] {
  const results: ParsedValue[][] = [];
  let i = 0;
  while (i < arrBody.length) {
    while (i < arrBody.length && /[\s,]/.test(arrBody[i])) i++;
    if (i >= arrBody.length) break;
    if (arrBody[i] !== '{') { i++; continue; }
    const obj = extractBalancedBody(arrBody, i, '{');
    if (!obj) break;
    results.push(parseObjectBody(obj.body));
    i = obj.end;
  }
  return results;
}

function getString(entries: ParsedValue[], key: string): string | undefined {
  const e = entries.find(x => x.key === key);
  return e && (e.kind === 'string' || e.kind === 'template') ? e.value : undefined;
}

function getObjectBody(entries: ParsedValue[], key: string): string | undefined {
  const e = entries.find(x => x.key === key);
  return e && e.kind === 'object' ? e.value : undefined;
}

function getArrayBody(entries: ParsedValue[], key: string): string | undefined {
  const e = entries.find(x => x.key === key);
  return e && e.kind === 'array' ? e.value : undefined;
}

// Locate `export const <name>` (as array or object) and return its balanced body.
function findExportedLiteral(content: string, name: string, open: '{' | '['): string | null {
  const re = new RegExp(`export\\s+const\\s+${name}\\b[^=]*=\\s*\\${open}`);
  const m = content.match(re);
  if (!m || m.index === undefined) return null;
  const openIdx = content.indexOf(open, m.index + m[0].length - 1);
  if (openIdx === -1) return null;
  const body = extractBalancedBody(content, openIdx, open);
  return body ? body.body : null;
}

// Locate `const <name>...= { ... }` (not exported).
function findLocalLiteral(content: string, name: string, open: '{' | '['): string | null {
  const re = new RegExp(`(?:^|\\n)\\s*const\\s+${name}\\b[^=]*=\\s*\\${open}`);
  const m = content.match(re);
  if (!m || m.index === undefined) return null;
  const openIdx = content.indexOf(open, m.index);
  if (openIdx === -1) return null;
  const body = extractBalancedBody(content, openIdx, open);
  return body ? body.body : null;
}

// ---------------------------------------------------------------------------
// Data models
// ---------------------------------------------------------------------------

interface SampleBaseEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  xml: string;
}

interface TutorialStepBase {
  id: string;
  title: string;
  content: string;
}

interface TutorialBaseEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  sampleXml: string;
  steps: TutorialStepBase[];
}

interface CategoryOverride { name?: string; description?: string; hasEntry: true; }
interface EntryOverride { title?: string; description?: string; hasEntry: true; }
interface StepOverride { title?: string; content?: string; hasEntry: true; }

interface LocaleSampleOverride {
  categories: Map<string, CategoryOverride>;
  samples: Map<string, EntryOverride>;
}

interface LocaleTutorialOverride {
  categories: Map<string, CategoryOverride>;
  tutorials: Map<string, EntryOverride & { steps: Map<string, StepOverride> }>;
}

// ---------------------------------------------------------------------------
// Parsers: canonical JA sources
// ---------------------------------------------------------------------------

function parseSampleBase(content: string): { entries: SampleBaseEntry[]; categoryKeys: string[] } {
  const arrBody = findExportedLiteral(content, 'sampleProjects', '[');
  const entries: SampleBaseEntry[] = [];
  if (arrBody) {
    for (const obj of parseArrayOfObjects(arrBody)) {
      const id = getString(obj, 'id');
      if (!id) continue;
      entries.push({
        id,
        title: getString(obj, 'title') ?? '',
        description: getString(obj, 'description') ?? '',
        category: getString(obj, 'category') ?? '',
        xml: getString(obj, 'blocklyXml') ?? '',
      });
    }
  }

  const catBody = findExportedLiteral(content, 'sampleCategories', '{');
  const categoryKeys = catBody ? parseObjectBody(catBody).map(p => p.key) : [];

  return { entries, categoryKeys };
}

function parseTutorialBase(content: string): { entries: TutorialBaseEntry[]; categoryKeys: string[] } {
  const arrBody = findExportedLiteral(content, 'tutorials', '[');
  const entries: TutorialBaseEntry[] = [];
  if (arrBody) {
    for (const obj of parseArrayOfObjects(arrBody)) {
      const id = getString(obj, 'id');
      if (!id) continue;
      const stepsArrBody = getArrayBody(obj, 'steps');
      const steps: TutorialStepBase[] = [];
      if (stepsArrBody) {
        for (const stepObj of parseArrayOfObjects(stepsArrBody)) {
          const sid = getString(stepObj, 'id');
          if (!sid) continue;
          steps.push({
            id: sid,
            title: getString(stepObj, 'title') ?? '',
            content: getString(stepObj, 'content') ?? '',
          });
        }
      }
      entries.push({
        id,
        title: getString(obj, 'title') ?? '',
        description: getString(obj, 'description') ?? '',
        category: getString(obj, 'category') ?? '',
        sampleXml: getString(obj, 'sampleXml') ?? '',
        steps,
      });
    }
  }

  const catBody = findExportedLiteral(content, 'tutorialCategories', '{');
  const categoryKeys = catBody ? parseObjectBody(catBody).map(p => p.key) : [];

  return { entries, categoryKeys };
}

// ---------------------------------------------------------------------------
// Parsers: i18n override maps
// ---------------------------------------------------------------------------

function parseCategoryOverrides(body: string): Map<string, CategoryOverride> {
  const out = new Map<string, CategoryOverride>();
  for (const p of parseObjectBody(body)) {
    if (p.kind !== 'object') continue;
    const inner = parseObjectBody(p.value);
    out.set(p.key, {
      name: getString(inner, 'name'),
      description: getString(inner, 'description'),
      hasEntry: true,
    });
  }
  return out;
}

function parseEntryOverrides(body: string): Map<string, EntryOverride> {
  const out = new Map<string, EntryOverride>();
  for (const p of parseObjectBody(body)) {
    if (p.kind !== 'object') continue;
    const inner = parseObjectBody(p.value);
    out.set(p.key, {
      title: getString(inner, 'title'),
      description: getString(inner, 'description'),
      hasEntry: true,
    });
  }
  return out;
}

function parseTutorialEntryOverrides(body: string): Map<string, EntryOverride & { steps: Map<string, StepOverride> }> {
  const out = new Map<string, EntryOverride & { steps: Map<string, StepOverride> }>();
  for (const p of parseObjectBody(body)) {
    if (p.kind !== 'object') continue;
    const inner = parseObjectBody(p.value);
    const stepsBody = getObjectBody(inner, 'steps');
    const steps = new Map<string, StepOverride>();
    if (stepsBody) {
      for (const sp of parseObjectBody(stepsBody)) {
        if (sp.kind !== 'object') continue;
        const stepInner = parseObjectBody(sp.value);
        steps.set(sp.key, {
          title: getString(stepInner, 'title'),
          content: getString(stepInner, 'content'),
          hasEntry: true,
        });
      }
    }
    out.set(p.key, {
      title: getString(inner, 'title'),
      description: getString(inner, 'description'),
      hasEntry: true,
      steps,
    });
  }
  return out;
}

function parseSampleI18n(content: string): Map<Locale, LocaleSampleOverride> {
  const overridesBody = findLocalLiteral(content, 'overrides', '{');
  const map = new Map<Locale, LocaleSampleOverride>();
  if (!overridesBody) return map;

  for (const p of parseObjectBody(overridesBody)) {
    if (p.kind !== 'object') continue;
    if (!(LOCALES as readonly string[]).includes(p.key)) continue;
    const inner = parseObjectBody(p.value);
    const catBody = getObjectBody(inner, 'categories');
    const samplesBody = getObjectBody(inner, 'samples');
    map.set(p.key as Locale, {
      categories: catBody ? parseCategoryOverrides(catBody) : new Map(),
      samples: samplesBody ? parseEntryOverrides(samplesBody) : new Map(),
    });
  }
  return map;
}

function parseTutorialI18n(content: string): Map<Locale, LocaleTutorialOverride> {
  const overridesBody = findLocalLiteral(content, 'overrides', '{');
  const map = new Map<Locale, LocaleTutorialOverride>();
  if (!overridesBody) return map;

  for (const p of parseObjectBody(overridesBody)) {
    if (p.kind !== 'object') continue;
    if (!(LOCALES as readonly string[]).includes(p.key)) continue;
    const inner = parseObjectBody(p.value);
    const catBody = getObjectBody(inner, 'categories');
    const tutorialsBody = getObjectBody(inner, 'tutorials');
    map.set(p.key as Locale, {
      categories: catBody ? parseCategoryOverrides(catBody) : new Map(),
      tutorials: tutorialsBody ? parseTutorialEntryOverrides(tutorialsBody) : new Map(),
    });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Catalog loader (for XML block-type reference check)
// ---------------------------------------------------------------------------

function loadCatalogBlockTypes(): Set<string> {
  if (!fs.existsSync(CATALOG_PATH)) return new Set();
  const json = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8')) as { blocks: Array<{ type: string }> };
  return new Set(json.blocks.map(b => b.type));
}

function extractBlockTypes(xml: string): string[] {
  return [...xml.matchAll(/<block\s+type="(\w+)"/g)].map(m => m[1]);
}

// ---------------------------------------------------------------------------
// Main audit
// ---------------------------------------------------------------------------

function main(): void {
  console.log('🔍 Auditing data consistency (samples / tutorials / i18n)...');

  const samplesSrc     = fs.readFileSync(SAMPLES_PATH, 'utf-8');
  const samplesI18nSrc = fs.readFileSync(SAMPLES_I18N_PATH, 'utf-8');
  const tutorialsSrc   = fs.readFileSync(TUTORIALS_PATH, 'utf-8');
  const tutorialsI18nSrc = fs.readFileSync(TUTORIALS_I18N_PATH, 'utf-8');

  const { entries: sampleEntries, categoryKeys: sampleCategoryKeys } = parseSampleBase(samplesSrc);
  const { entries: tutorialEntries, categoryKeys: tutorialCategoryKeys } = parseTutorialBase(tutorialsSrc);
  const sampleI18n   = parseSampleI18n(samplesI18nSrc);
  const tutorialI18n = parseTutorialI18n(tutorialsI18nSrc);
  const catalogTypes = loadCatalogBlockTypes();

  console.log(`   sampleProjects: ${sampleEntries.length} canonical, ${sampleCategoryKeys.length} categories`);
  console.log(`   tutorials:      ${tutorialEntries.length} canonical, ${tutorialCategoryKeys.length} categories`);
  console.log(`   locales audited: ${LOCALES.join(', ')}`);
  console.log(`   catalog block types loaded: ${catalogTypes.size}`);

  const errors: string[] = [];
  const warnings: string[] = [];

  const baseSampleIds = new Set(sampleEntries.map(e => e.id));
  const baseSampleCats = new Set(sampleCategoryKeys);
  const baseTutorialIds = new Set(tutorialEntries.map(e => e.id));
  const baseTutorialCats = new Set(tutorialCategoryKeys);
  const baseTutorialStepsByTutorial = new Map(tutorialEntries.map(e => [e.id, new Set(e.steps.map(s => s.id))]));

  // --- samples i18n ---
  for (const locale of LOCALES) {
    const ov = sampleI18n.get(locale);
    if (!ov) {
      warnings.push(`⚠️  [COVERAGE_SAMPLES] locale "${locale}" has no overrides object`);
      continue;
    }

    // sample id orphans + empties
    for (const [id, override] of ov.samples) {
      if (!baseSampleIds.has(id)) {
        errors.push(`❌ [ORPHAN_SAMPLE] ${locale}: sample id "${id}" has no base entry in sampleProjects.ts`);
        continue;
      }
      if (override.title !== undefined && override.title.trim() === '') {
        errors.push(`❌ [EMPTY_SAMPLE_TITLE] ${locale}: sample "${id}" has empty title override`);
      }
      if (override.description !== undefined && override.description.trim() === '') {
        errors.push(`❌ [EMPTY_SAMPLE_DESC] ${locale}: sample "${id}" has empty description override`);
      }
    }
    // coverage: canonical ids not translated
    for (const id of baseSampleIds) {
      if (!ov.samples.has(id)) {
        warnings.push(`⚠️  [COVERAGE_SAMPLES] ${locale}: sample "${id}" not translated`);
      }
    }

    // category orphans + coverage
    for (const [key] of ov.categories) {
      if (!baseSampleCats.has(key)) {
        errors.push(`❌ [ORPHAN_SAMPLE_CAT] ${locale}: sample category "${key}" has no base entry`);
      }
    }
    for (const key of baseSampleCats) {
      if (!ov.categories.has(key)) {
        warnings.push(`⚠️  [COVERAGE_SAMPLE_CAT] ${locale}: sample category "${key}" not translated`);
      }
    }
  }

  // --- tutorials i18n ---
  for (const locale of LOCALES) {
    const ov = tutorialI18n.get(locale);
    if (!ov) {
      warnings.push(`⚠️  [COVERAGE_TUTORIALS] locale "${locale}" has no overrides object`);
      continue;
    }

    // tutorial id orphans + empties + step orphans
    for (const [id, override] of ov.tutorials) {
      if (!baseTutorialIds.has(id)) {
        errors.push(`❌ [ORPHAN_TUTORIAL] ${locale}: tutorial id "${id}" has no base entry in tutorials.ts`);
        continue;
      }
      if (override.title !== undefined && override.title.trim() === '') {
        errors.push(`❌ [EMPTY_TUTORIAL_TITLE] ${locale}: tutorial "${id}" has empty title override`);
      }
      if (override.description !== undefined && override.description.trim() === '') {
        errors.push(`❌ [EMPTY_TUTORIAL_DESC] ${locale}: tutorial "${id}" has empty description override`);
      }

      const baseStepIds = baseTutorialStepsByTutorial.get(id) ?? new Set<string>();
      for (const [stepId, stepOverride] of override.steps) {
        if (!baseStepIds.has(stepId)) {
          errors.push(`❌ [ORPHAN_STEP] ${locale}: tutorial "${id}" step id "${stepId}" has no base entry`);
          continue;
        }
        if (stepOverride.title !== undefined && stepOverride.title.trim() === '') {
          errors.push(`❌ [EMPTY_STEP_TITLE] ${locale}: tutorial "${id}" step "${stepId}" has empty title override`);
        }
        if (stepOverride.content !== undefined && stepOverride.content.trim() === '') {
          errors.push(`❌ [EMPTY_STEP_CONTENT] ${locale}: tutorial "${id}" step "${stepId}" has empty content override`);
        }
      }
    }
    // coverage
    for (const id of baseTutorialIds) {
      if (!ov.tutorials.has(id)) {
        warnings.push(`⚠️  [COVERAGE_TUTORIALS] ${locale}: tutorial "${id}" not translated`);
      }
    }

    // category orphans + coverage
    for (const [key] of ov.categories) {
      if (!baseTutorialCats.has(key)) {
        errors.push(`❌ [ORPHAN_TUTORIAL_CAT] ${locale}: tutorial category "${key}" has no base entry`);
      }
    }
    for (const key of baseTutorialCats) {
      if (!ov.categories.has(key)) {
        warnings.push(`⚠️  [COVERAGE_TUTORIAL_CAT] ${locale}: tutorial category "${key}" not translated`);
      }
    }
  }

  // --- tutorial XML block-type references → catalog ---
  // sampleProjects.blocklyXml is already audited by audit-ai-catalog.ts (all samples scope),
  // so we only cover tutorials.sampleXml here to avoid duplicate reporting.
  if (catalogTypes.size === 0) {
    warnings.push('⚠️  [CATALOG_REF] block-catalog.json missing; skipping tutorial XML block-type check');
  } else {
    for (const t of tutorialEntries) {
      if (!t.sampleXml) continue;
      const knownBroken = KNOWN_BROKEN_TUTORIALS.has(t.id);
      for (const blockType of extractBlockTypes(t.sampleXml)) {
        if (!catalogTypes.has(blockType)) {
          const msg = `tutorial "${t.id}" sampleXml references unknown block type "${blockType}"`;
          if (knownBroken) {
            warnings.push(`⚠️  [KNOWN_BROKEN] ${msg}`);
          } else {
            errors.push(`❌ [CATALOG_REF] ${msg}`);
          }
        }
      }
    }
  }

  if (warnings.length > 0) {
    for (const w of warnings) console.warn(w);
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    console.error(`\n❌ ${errors.length} error(s) found. Fix before building.`);
    process.exit(1);
  }

  console.log(`✅ All audits passed (${warnings.length} warning(s))`);
}

main();
