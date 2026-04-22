/**
 * audit-ai-catalog.ts
 *
 * Verifies three-way consistency: catalog ↔ source, catalog ↔ few-shot, shape validity.
 * Run via: npx tsx scripts/audit-ai-catalog.ts
 * Auto-run: "prebuild" hook in package.json
 *
 * Exit 0 → all checks passed
 * Exit 1 → at least one ❌ error found
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.join(__dirname, '..');

const CATALOG_PATH = path.join(FRONTEND_DIR, 'public/ai/block-catalog.json');
const BLOCKS_DIR   = path.join(FRONTEND_DIR, 'src/blocks');
const SAMPLES_PATH = path.join(FRONTEND_DIR, 'src/data/sampleProjects.ts');

// FEW_SHOT_MODE_IDS — must be kept in sync with systemPrompt.ts
const FEW_SHOT_IDS = new Set([
  'humanoid-dance', 'led-blink', 'serial-hello',
  'wheel-obstacle', 'transform-ninja',
  'dht-sensor', 'ultrasonic-distance',
]);

// ---------------------------------------------------------------------------
// Types (mirror generate-ai-block-catalog.ts)
// ---------------------------------------------------------------------------

interface FieldDef {
  name: string;
  fieldType: string;
  isCredential?: boolean;
  isDynamic?: boolean;
  options?: string[];
}
interface ValueInputDef { name: string; check: string | null; }
interface StatementInputDef { name: string; }
interface BlockEntry {
  type: string;
  isStatement: boolean;
  hasOutput: boolean;
  fields: FieldDef[];
  valueInputs: ValueInputDef[];
  statementInputs: StatementInputDef[];
  builtin?: boolean;
}
interface BlockCatalog {
  blocks: BlockEntry[];
}

// ---------------------------------------------------------------------------
// Load catalog
// ---------------------------------------------------------------------------

function loadCatalog(): BlockCatalog {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8')) as BlockCatalog;
}

// ---------------------------------------------------------------------------
// Check 1: catalog ↔ source (shape consistency)
// Only custom blocks (not builtin) are verified against source.
// ---------------------------------------------------------------------------

function getBlockFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...getBlockFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.ts')) files.push(full);
  }
  return files;
}

function checkCatalogVsSource(catalog: BlockCatalog): string[] {
  const errors: string[] = [];

  // Build a map of source-extracted shapes
  const sourceIsStatement = new Map<string, boolean>();
  const sourceHasOutput   = new Map<string, boolean>();

  for (const file of getBlockFiles(BLOCKS_DIR)) {
    const content = fs.readFileSync(file, 'utf-8');
    const re = /Blockly\.Blocks\['(\w+)'\]\s*=\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const blockType = m[1];
      const bodyStart = m.index;
      const nextStart = content.indexOf("\nBlockly.Blocks['", bodyStart + 10);
      const body = nextStart !== -1
        ? content.substring(bodyStart, nextStart)
        : content.substring(bodyStart);

      sourceIsStatement.set(blockType, /setPreviousStatement\(true/.test(body));
      sourceHasOutput.set(blockType, /setOutput\(true/.test(body));
    }
  }

  for (const b of catalog.blocks) {
    if (b.builtin) continue; // builtins come from BUILTIN_CORRECT_META, not source

    const srcIsStmt = sourceIsStatement.get(b.type);
    const srcHasOut = sourceHasOutput.get(b.type);

    if (srcIsStmt === undefined) {
      // Block referenced in toolbox but not found in source files
      errors.push(`❌ [CATALOG_VS_SOURCE] ${b.type}: in catalog but not found in src/blocks/**`);
      continue;
    }

    if (b.isStatement !== srcIsStmt) {
      errors.push(`❌ [CATALOG_VS_SOURCE] ${b.type}: isStatement catalog=${b.isStatement} source=${srcIsStmt}`);
    }
    if (b.hasOutput !== srcHasOut) {
      errors.push(`❌ [CATALOG_VS_SOURCE] ${b.type}: hasOutput catalog=${b.hasOutput} source=${srcHasOut}`);
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Check 2 + 3: catalog ↔ few-shot XML (existence + shape)
// ---------------------------------------------------------------------------

function parseSampleXmls(samplesTs: string): Map<string, string> {
  const map = new Map<string, string>();

  // Extract id and blocklyXml from each sample entry.
  // We match:  id: 'SAMPLE_ID',  ...  blocklyXml: `...`
  const sampleRe = /id:\s*'([^']+)'[\s\S]*?blocklyXml:\s*`([\s\S]*?)`/g;
  let m: RegExpExecArray | null;
  while ((m = sampleRe.exec(samplesTs)) !== null) {
    const id  = m[1];
    const xml = m[2];
    if (FEW_SHOT_IDS.has(id)) map.set(id, xml);
  }
  return map;
}

// Extract all <block type="X"> occurrences from XML
function extractBlockTypes(xml: string): string[] {
  return [...xml.matchAll(/<block\s+type="(\w+)"/g)].map(m => m[1]);
}

// Extract <field name="X"> occurrences (returns pairs of [blockType, fieldName])
// Simple approach: scan for field elements and associate with their nearest ancestor block
function extractFieldsInContext(xml: string): Array<{ blockType: string; fieldName: string }> {
  const result: Array<{ blockType: string; fieldName: string }> = [];
  // We'll do a simplified pass: match every <block type="T"...>...</block> region
  // and find <field name="F"> inside it. Use a stack-based approach.
  let pos = 0;
  const blockStack: string[] = [];

  while (pos < xml.length) {
    // Look for the next < character
    const lt = xml.indexOf('<', pos);
    if (lt === -1) break;

    // Check for block open tag
    const blockOpenM = xml.slice(lt).match(/^<block\s+type="(\w+)"[^>]*>/);
    if (blockOpenM) {
      blockStack.push(blockOpenM[1]);
      pos = lt + blockOpenM[0].length;
      continue;
    }

    // Check for block self-close (shouldn't happen but just in case)
    const blockSelfM = xml.slice(lt).match(/^<block\s+type="(\w+)"[^>]*\/>/);
    if (blockSelfM) {
      pos = lt + blockSelfM[0].length;
      continue;
    }

    // Check for </block>
    if (xml.slice(lt).startsWith('</block>')) {
      blockStack.pop();
      pos = lt + 8;
      continue;
    }

    // Check for <field name="F">
    const fieldM = xml.slice(lt).match(/^<field\s+name="(\w+)"[^>]*>/);
    if (fieldM && blockStack.length > 0) {
      result.push({ blockType: blockStack[blockStack.length - 1], fieldName: fieldM[1] });
      pos = lt + fieldM[0].length;
      continue;
    }

    // Check for <value name="V"> — record for shape check later
    // Check for <statement name="S">
    pos = lt + 1;
  }

  return result;
}

// Extract <value name="X"> children block types (to check hasOutput requirement)
function extractValueChildren(xml: string): Array<{ valueName: string; childType: string; parentType: string }> {
  const result: Array<{ valueName: string; childType: string; parentType: string }> = [];
  const re = /<value\s+name="(\w+)"[^>]*>\s*<block\s+type="(\w+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    // Find enclosing block type (simple heuristic: search backward for nearest <block type=
    const before = xml.slice(0, m.index);
    const parentM = [...before.matchAll(/<block\s+type="(\w+)"/g)];
    const parentType = parentM.length > 0 ? parentM[parentM.length - 1][1] : '(unknown)';
    result.push({ valueName: m[1], childType: m[2], parentType });
  }
  return result;
}

// Extract <statement name="S"> / <next> children block types (to check isStatement requirement)
function extractStatementChildren(xml: string): Array<{ childType: string }> {
  const result: Array<{ childType: string }> = [];
  // Matches <statement ...><block type="T"> and <next><block type="T">
  const stmtRe = /(?:<statement[^>]*>|<next>)\s*<block\s+type="(\w+)"/g;
  let m: RegExpExecArray | null;
  while ((m = stmtRe.exec(xml)) !== null) {
    result.push({ childType: m[1] });
  }
  return result;
}

function checkCatalogVsFewShot(catalog: BlockCatalog, sampleXmls: Map<string, string>): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byType = new Map(catalog.blocks.map(b => [b.type, b]));

  for (const [sampleId, xml] of sampleXmls) {

    // Check 2a: all block types exist in catalog
    for (const blockType of extractBlockTypes(xml)) {
      if (!byType.has(blockType)) {
        errors.push(`❌ [FEW_SHOT] ${sampleId}: block type "${blockType}" not in catalog`);
      }
    }

    // Check 2b: field names exist in catalog block's fields
    for (const { blockType, fieldName } of extractFieldsInContext(xml)) {
      const entry = byType.get(blockType);
      if (!entry) continue; // already reported above
      if (!entry.fields.some(f => f.name === fieldName)) {
        errors.push(`❌ [FEW_SHOT] ${sampleId}: block "${blockType}" has no field "${fieldName}" in catalog`);
      }
    }

    // Check 3a: <value> slots hold hasOutput=true blocks
    for (const { valueName, childType, parentType } of extractValueChildren(xml)) {
      const entry = byType.get(childType);
      if (!entry) continue; // already reported
      if (!entry.hasOutput) {
        errors.push(`❌ [SHAPE] ${sampleId}: "${childType}" placed in <value name="${valueName}"> of "${parentType}" but hasOutput=false`);
      }
    }

    // Check 3b: <statement>/<next> slots hold isStatement=true blocks
    for (const { childType } of extractStatementChildren(xml)) {
      const entry = byType.get(childType);
      if (!entry) continue;
      if (!entry.isStatement) {
        errors.push(`❌ [SHAPE] ${sampleId}: "${childType}" placed in <statement>/<next> but isStatement=false`);
      }
    }

    // Warning: isDynamic fields referenced in few-shot (non-fatal)
    for (const { blockType, fieldName } of extractFieldsInContext(xml)) {
      const entry = byType.get(blockType);
      if (!entry) continue;
      const field = entry.fields.find(f => f.name === fieldName);
      if (field?.isDynamic) {
        warnings.push(`⚠️  [DYNAMIC] ${sampleId}: block "${blockType}" field "${fieldName}" is isDynamic — value may not be valid`);
      }
    }
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Check 4: internal catalog consistency (no block has both isStatement+hasOutput)
// ---------------------------------------------------------------------------

function checkInternalConsistency(catalog: BlockCatalog): string[] {
  const errors: string[] = [];
  for (const b of catalog.blocks) {
    if (b.isStatement && b.hasOutput) {
      errors.push(`❌ [INTERNAL] ${b.type}: both isStatement=true and hasOutput=true (impossible shape)`);
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log('🔍 Auditing AI block catalog...');

  if (!fs.existsSync(CATALOG_PATH)) {
    console.error('❌ [SETUP] block-catalog.json not found. Run generate-ai-block-catalog.ts first.');
    process.exit(1);
  }

  const catalog = loadCatalog();
  const samplesTs = fs.readFileSync(SAMPLES_PATH, 'utf-8');
  const sampleXmls = parseSampleXmls(samplesTs);

  console.log(`   Catalog blocks: ${catalog.blocks.length}`);
  console.log(`   FEW_SHOT samples loaded: ${sampleXmls.size} / ${FEW_SHOT_IDS.size}`);

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Check 1
  const srcErrors = checkCatalogVsSource(catalog);
  allErrors.push(...srcErrors);

  // Check 2 + 3
  const { errors: fewShotErrors, warnings: fewShotWarnings } = checkCatalogVsFewShot(catalog, sampleXmls);
  allErrors.push(...fewShotErrors);
  allWarnings.push(...fewShotWarnings);

  // Check 4
  const internalErrors = checkInternalConsistency(catalog);
  allErrors.push(...internalErrors);

  // FEW_SHOT coverage warning
  for (const id of FEW_SHOT_IDS) {
    if (!sampleXmls.has(id)) {
      allWarnings.push(`⚠️  [COVERAGE] FEW_SHOT sample "${id}" not found in sampleProjects.ts`);
    }
  }

  if (allWarnings.length > 0) {
    for (const w of allWarnings) console.warn(w);
  }

  if (allErrors.length > 0) {
    for (const e of allErrors) console.error(e);
    console.error(`\n❌ ${allErrors.length} error(s) found. Fix before building.`);
    process.exit(1);
  }

  console.log(`✅ All audits passed (${allWarnings.length} warning(s))`);
}

main();
