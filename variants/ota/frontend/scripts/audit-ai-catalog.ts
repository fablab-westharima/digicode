/**
 * audit-ai-catalog.ts
 *
 * Verifies three-way consistency: catalog ↔ source, catalog ↔ XML samples, shape validity.
 *
 * Scope (Phase 2, 2026-04-24):
 * - All sampleProjects (not just FEW_SHOT) are checked for catalog conformance.
 * - Custom block shapes (fields / valueInputs / statementInputs) are verified by name
 *   against their source definitions (catalog → source direction).
 * - <mutation> attributes on controls_if / controls_ifelse expand the allowed
 *   value/statement slot name set dynamically (prevents false positives on ELSE / IF1 / DO1).
 * - Dropdown <field> values in XML are validated against their catalog options
 *   (isDynamic fields are skipped).
 *
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

// FEW_SHOT_MODE_IDS — must be kept in sync with systemPrompt.ts.
// After Phase 2 these are no longer a filter: they're only used for coverage reporting.
const FEW_SHOT_IDS = new Set([
  'humanoid-dance', 'led-blink', 'serial-hello',
  'wheel-obstacle', 'transform-ninja',
  'dht-sensor', 'ultrasonic-distance',
]);

// Samples whose XML references blocks/fields/slots that no longer exist in the catalog.
// They predate Phase 2 (audit scope expansion exposed them for the first time) and are
// slated for a full rewrite in 37.md (samples/tutorials rebuild). Their shape errors are
// demoted to warnings tagged [KNOWN_BROKEN] so the audit can ship as a gating tool
// without blocking the build on pre-existing data.
// Remove each entry the moment its sample is reauthored — the audit will then fail
// if a new drift appears, which is the intended long-term behaviour.
const KNOWN_BROKEN_SAMPLES = new Set<string>([]);

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

interface SourceShape {
  isStatement: boolean;
  hasOutput: boolean;
  fields: Set<string>;
  valueInputs: Set<string>;
  statementInputs: Set<string>;
}

// Slot usage recovered from an XML sample, used for existence + shape + value checks.
type SlotKind = 'field' | 'value' | 'statement';
interface SlotUsage {
  parentBlockType: string;
  kind: SlotKind;
  slotName: string;
  fieldValue?: string;       // field only (trimmed inner text)
  childBlockType?: string;   // value / statement: the first direct child <block>/<shadow> type
}

// ---------------------------------------------------------------------------
// Load catalog
// ---------------------------------------------------------------------------

function loadCatalog(): BlockCatalog {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8')) as BlockCatalog;
}

// ---------------------------------------------------------------------------
// Source scanning
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

/**
 * Parse each Blockly.Blocks['X'] = { ... } definition into a SourceShape.
 * The extraction mirrors generate-ai-block-catalog.ts parseBlockMeta for the same
 * five Field classes (Number / Dropdown / TextInput / Checkbox / Angle) — any field
 * registered via other means (e.g. FieldVariable / FieldImage) is intentionally ignored,
 * because such fields don't appear in the generated catalog either.
 */
function extractSourceShapes(): Map<string, SourceShape> {
  const shapes = new Map<string, SourceShape>();

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

      // Mirrors generate-ai-block-catalog.ts parseBlockMeta so the two stay aligned.
      // Why per-class regexes instead of a single greedy one: FieldDropdown's inline array
      // contains nested '()' (e.g. `(Blockly.Msg as any)` casts) that break a naive
      // `[\s\S]*?\)` match and cause it to capture the wrong name (e.g. 'LEFT' instead of 'WHEEL').
      const fields = new Set<string>();
      let fm: RegExpExecArray | null;
      const numRe       = /new Blockly\.FieldNumber\([^)]*\),\s*'(\w+)'/g;
      // Regex allows compound type assertions (` as any`, ` as unknown as Blockly.Field`)
      const ddInlineRe  = /new Blockly\.FieldDropdown\(\[[\s\S]*?\]\)(?:\s+as\s+[^,]+?)?,\s*'(\w+)'/g;
      const ddIdentRe   = /new Blockly\.FieldDropdown\([a-zA-Z_]\w*\)(?:\s+as\s+[^,]+?)?,\s*'(\w+)'/g;
      const textRe      = /new Blockly\.FieldTextInput\(['"][^'"]*['"]\),\s*'(\w+)'/g;
      const cbRe        = /new Blockly\.FieldCheckbox\([^)]*\),\s*'(\w+)'/g;
      const angRe       = /new Blockly\.FieldAngle\([^)]*\),\s*'(\w+)'/g;
      for (const re of [numRe, ddInlineRe, ddIdentRe, textRe, cbRe, angRe]) {
        while ((fm = re.exec(body)) !== null) fields.add(fm[1]);
      }

      const valueInputs = new Set<string>();
      const vRe = /\.appendValueInput\(\s*['"](\w+)['"]\s*\)/g;
      while ((fm = vRe.exec(body)) !== null) valueInputs.add(fm[1]);

      const statementInputs = new Set<string>();
      const sRe = /\.appendStatementInput\(\s*['"](\w+)['"]\s*\)/g;
      while ((fm = sRe.exec(body)) !== null) statementInputs.add(fm[1]);

      shapes.set(blockType, {
        isStatement: /setPreviousStatement\(true/.test(body),
        hasOutput: /setOutput\(true/.test(body),
        fields, valueInputs, statementInputs,
      });
    }
  }

  return shapes;
}

// ---------------------------------------------------------------------------
// Check 1: catalog ↔ source
//   - isStatement / hasOutput parity (existing)
//   - catalog → source name parity for fields / valueInputs / statementInputs (NEW)
// Only custom blocks (not builtin) are verified against source; builtins come
// from BUILTIN_CORRECT_META in the generator, which is authoritative by design.
// ---------------------------------------------------------------------------

function checkCatalogVsSource(catalog: BlockCatalog): string[] {
  const errors: string[] = [];
  const shapes = extractSourceShapes();

  for (const b of catalog.blocks) {
    if (b.builtin) continue;

    const src = shapes.get(b.type);
    if (!src) {
      errors.push(`❌ [CATALOG_VS_SOURCE] ${b.type}: in catalog but not found in src/blocks/**`);
      continue;
    }

    if (b.isStatement !== src.isStatement) {
      errors.push(`❌ [CATALOG_VS_SOURCE] ${b.type}: isStatement catalog=${b.isStatement} source=${src.isStatement}`);
    }
    if (b.hasOutput !== src.hasOutput) {
      errors.push(`❌ [CATALOG_VS_SOURCE] ${b.type}: hasOutput catalog=${b.hasOutput} source=${src.hasOutput}`);
    }

    for (const f of b.fields) {
      if (!src.fields.has(f.name)) {
        errors.push(`❌ [CATALOG_VS_SOURCE] ${b.type}: field "${f.name}" in catalog but not in source`);
      }
    }
    for (const v of b.valueInputs) {
      if (!src.valueInputs.has(v.name)) {
        errors.push(`❌ [CATALOG_VS_SOURCE] ${b.type}: valueInput "${v.name}" in catalog but not in source`);
      }
    }
    for (const s of b.statementInputs) {
      if (!src.statementInputs.has(s.name)) {
        errors.push(`❌ [CATALOG_VS_SOURCE] ${b.type}: statementInput "${s.name}" in catalog but not in source`);
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Sample XML parsing
// ---------------------------------------------------------------------------

/**
 * Extract id → blocklyXml for every entry in sampleProjects.ts.
 * Phase 2 change: FEW_SHOT filter removed — all samples are now audited.
 */
function parseSampleXmls(samplesTs: string): Map<string, string> {
  const map = new Map<string, string>();
  const sampleRe = /id:\s*'([^']+)'[\s\S]*?blocklyXml:\s*`([\s\S]*?)`/g;
  let m: RegExpExecArray | null;
  while ((m = sampleRe.exec(samplesTs)) !== null) {
    map.set(m[1], m[2]);
  }
  return map;
}

// Extract all <block type="X"> occurrences from XML (block references).
function extractBlockTypes(xml: string): string[] {
  return [...xml.matchAll(/<block\s+type="(\w+)"/g)].map(m => m[1]);
}

/**
 * Collect value/statement input names added by <mutation> on controls_if / controls_ifelse.
 * Blockly's if-else mutation grammar:
 *   elseif="N" → adds IF1..IFN value inputs + DO1..DON statement inputs
 *   else="1"   → adds ELSE statement input
 *
 * The return value is a union across all mutation-bearing blocks in the XML.
 * This is a small over-approximation (a mutation-free controls_if in the same XML
 * would nominally allow the same names) but Blockly would reject such invalid XML
 * at load time anyway, so the trade-off is acceptable for Phase 2.
 */
function collectMutationDynamics(xml: string): { valueInputs: Set<string>; statementInputs: Set<string> } {
  const valueInputs = new Set<string>();
  const statementInputs = new Set<string>();

  const re = /<block\s+type="(controls_if|controls_ifelse)"[^>]*>\s*<mutation\s+([^/>]*)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[2];
    const elseifM = attrs.match(/elseif="(\d+)"/);
    if (elseifM) {
      const n = parseInt(elseifM[1], 10);
      for (let i = 1; i <= n; i++) {
        valueInputs.add(`IF${i}`);
        statementInputs.add(`DO${i}`);
      }
    }
    if (/else="1"/.test(attrs)) statementInputs.add('ELSE');
  }

  return { valueInputs, statementInputs };
}

/**
 * Walk an XML fragment and record every <field>, <value>, <statement> usage with its
 * parent <block type>. Fields also carry their inner text (for dropdown value checks);
 * values/statements carry the first direct child block type (for shape verification).
 *
 * The scanner ignores <next> (which is a pure linking element, not a block ancestor)
 * and treats <shadow> identically to <block> for stack purposes.
 */
function parseXmlSlots(xml: string): SlotUsage[] {
  const out: SlotUsage[] = [];
  const blockStack: string[] = [];
  const slotStack: Array<{ parent: string; kind: 'value' | 'statement'; name: string; childBlockType?: string }> = [];
  let pos = 0;

  while (pos < xml.length) {
    const lt = xml.indexOf('<', pos);
    if (lt === -1) break;
    const rest = xml.slice(lt);

    if (rest.startsWith('</block>') || rest.startsWith('</shadow>')) {
      blockStack.pop();
      pos = lt + (rest.startsWith('</block>') ? 8 : 9);
      continue;
    }

    if (rest.startsWith('</value>')) {
      const s = slotStack.pop();
      if (s && s.kind === 'value') {
        out.push({ parentBlockType: s.parent, kind: 'value', slotName: s.name, childBlockType: s.childBlockType });
      }
      pos = lt + 8;
      continue;
    }
    if (rest.startsWith('</statement>')) {
      const s = slotStack.pop();
      if (s && s.kind === 'statement') {
        out.push({ parentBlockType: s.parent, kind: 'statement', slotName: s.name, childBlockType: s.childBlockType });
      }
      pos = lt + 12;
      continue;
    }

    // <field name="F">VALUE</field>
    const fieldM = rest.match(/^<field\s+name="(\w+)"[^>]*>([\s\S]*?)<\/field>/);
    if (fieldM && blockStack.length > 0) {
      out.push({
        parentBlockType: blockStack[blockStack.length - 1],
        kind: 'field',
        slotName: fieldM[1],
        fieldValue: fieldM[2].trim(),
      });
      pos = lt + fieldM[0].length;
      continue;
    }

    // <value name="V">
    const valueM = rest.match(/^<value\s+name="(\w+)"[^>]*>/);
    if (valueM && blockStack.length > 0) {
      slotStack.push({ parent: blockStack[blockStack.length - 1], kind: 'value', name: valueM[1] });
      pos = lt + valueM[0].length;
      continue;
    }

    // <statement name="S">
    const stmtM = rest.match(/^<statement\s+name="(\w+)"[^>]*>/);
    if (stmtM && blockStack.length > 0) {
      slotStack.push({ parent: blockStack[blockStack.length - 1], kind: 'statement', name: stmtM[1] });
      pos = lt + stmtM[0].length;
      continue;
    }

    // <block type="T"> or <shadow type="T"> (open or self-closing)
    const blockOpenM = rest.match(/^<(block|shadow)\s+type="(\w+)"[^>]*?(\/?)>/);
    if (blockOpenM) {
      const blockType = blockOpenM[2];
      const selfClose = blockOpenM[3] === '/';
      const topSlot = slotStack.length > 0 ? slotStack[slotStack.length - 1] : undefined;
      // Record first direct child: the slot's parent must be the current blockStack top,
      // meaning we're immediately inside the slot (not within a deeper child block).
      if (topSlot && topSlot.childBlockType === undefined && topSlot.parent === blockStack[blockStack.length - 1]) {
        topSlot.childBlockType = blockType;
      }
      if (!selfClose) blockStack.push(blockType);
      pos = lt + blockOpenM[0].length;
      continue;
    }

    // Any other tag (<mutation>, <xml>, <next>, comments): advance by one char.
    pos = lt + 1;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Check 2 + 3 + 4: catalog ↔ sample XMLs
//   Check 2a: block type exists in catalog
//   Check 2b: field name exists on that block (in catalog)
//   Check 2c: value/statement slot name exists on parent (catalog + mutation dynamics)
//   Check 3a: <value> child has hasOutput=true
//   Check 3b: <statement>/<next> child has isStatement=true
//   Check 4:  dropdown <field> value is in catalog options (unless isDynamic)
// ---------------------------------------------------------------------------

function checkCatalogVsSamples(
  catalog: BlockCatalog,
  sampleXmls: Map<string, string>,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byType = new Map(catalog.blocks.map(b => [b.type, b]));

  for (const [sampleId, xml] of sampleXmls) {
    const knownBroken = KNOWN_BROKEN_SAMPLES.has(sampleId);
    // pushIssue: fail normally, but demote to [KNOWN_BROKEN] warning for samples
    // that are slated for a full rewrite in 37.md. The tag is chosen so grep-for-errors
    // reviews and ripgrep-based dashboards can still surface them as pending work.
    const pushIssue = (msg: string): void => {
      if (knownBroken) {
        warnings.push(`⚠️  [KNOWN_BROKEN] ${msg.replace(/^❌\s+/, '')}`);
      } else {
        errors.push(msg);
      }
    };

    const muts = collectMutationDynamics(xml);

    // Check 2a: every <block type="X"> is in catalog
    for (const blockType of extractBlockTypes(xml)) {
      if (!byType.has(blockType)) {
        pushIssue(`❌ [SAMPLE] ${sampleId}: block type "${blockType}" not in catalog`);
      }
    }

    const slots = parseXmlSlots(xml);

    for (const slot of slots) {
      const entry = byType.get(slot.parentBlockType);
      if (!entry) continue; // already reported in 2a

      if (slot.kind === 'field') {
        const field = entry.fields.find(f => f.name === slot.slotName);
        if (!field) {
          pushIssue(`❌ [SAMPLE] ${sampleId}: block "${slot.parentBlockType}" has no field "${slot.slotName}" in catalog`);
          continue;
        }
        // Check 4: dropdown value validity
        if (
          field.fieldType === 'dropdown' &&
          !field.isDynamic &&
          field.options && field.options.length > 0 &&
          slot.fieldValue !== undefined && slot.fieldValue.length > 0 &&
          !field.options.includes(slot.fieldValue)
        ) {
          pushIssue(`❌ [VALUE] ${sampleId}: ${slot.parentBlockType}.${slot.slotName}="${slot.fieldValue}" not in options [${field.options.join('|')}]`);
        }
        if (field.isDynamic) {
          warnings.push(`⚠️  [DYNAMIC] ${sampleId}: block "${slot.parentBlockType}" field "${slot.slotName}" is isDynamic — value may not be valid`);
        }
      } else if (slot.kind === 'value') {
        // Check 2c (value): slot name must be in catalog.valueInputs OR in mutation dynamics
        const allowed = new Set(entry.valueInputs.map(v => v.name));
        muts.valueInputs.forEach(v => allowed.add(v));
        if (!allowed.has(slot.slotName)) {
          pushIssue(`❌ [SHAPE] ${sampleId}: block "${slot.parentBlockType}" has no <value name="${slot.slotName}"> in catalog`);
        }
        // Check 3a: child in <value> must have hasOutput=true
        if (slot.childBlockType) {
          const child = byType.get(slot.childBlockType);
          if (child && !child.hasOutput) {
            pushIssue(`❌ [SHAPE] ${sampleId}: "${slot.childBlockType}" placed in <value name="${slot.slotName}"> of "${slot.parentBlockType}" but hasOutput=false`);
          }
        }
      } else if (slot.kind === 'statement') {
        // Check 2c (statement): slot name must be in catalog.statementInputs OR in mutation dynamics
        const allowed = new Set(entry.statementInputs.map(s => s.name));
        muts.statementInputs.forEach(s => allowed.add(s));
        if (!allowed.has(slot.slotName)) {
          pushIssue(`❌ [SHAPE] ${sampleId}: block "${slot.parentBlockType}" has no <statement name="${slot.slotName}"> in catalog`);
        }
        // Check 3b: child in <statement> must have isStatement=true
        if (slot.childBlockType) {
          const child = byType.get(slot.childBlockType);
          if (child && !child.isStatement) {
            pushIssue(`❌ [SHAPE] ${sampleId}: "${slot.childBlockType}" placed in <statement name="${slot.slotName}"> of "${slot.parentBlockType}" but isStatement=false`);
          }
        }
      }
    }

    // Check 3b (cont.): <next><block type="C"> — child must have isStatement=true
    const nextChildRe = /<next>\s*<block\s+type="(\w+)"/g;
    let nm: RegExpExecArray | null;
    while ((nm = nextChildRe.exec(xml)) !== null) {
      const childType = nm[1];
      const child = byType.get(childType);
      if (child && !child.isStatement) {
        pushIssue(`❌ [SHAPE] ${sampleId}: "${childType}" placed in <next> but isStatement=false`);
      }
    }
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Check 5: internal catalog consistency (no block has both isStatement+hasOutput)
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
  const fewShotCovered = [...FEW_SHOT_IDS].filter(id => sampleXmls.has(id)).length;

  console.log(`   Catalog blocks: ${catalog.blocks.length}`);
  console.log(`   Samples audited: ${sampleXmls.size} (FEW_SHOT coverage: ${fewShotCovered}/${FEW_SHOT_IDS.size})`);

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  allErrors.push(...checkCatalogVsSource(catalog));

  const { errors: sampleErrors, warnings: sampleWarnings } = checkCatalogVsSamples(catalog, sampleXmls);
  allErrors.push(...sampleErrors);
  allWarnings.push(...sampleWarnings);

  allErrors.push(...checkInternalConsistency(catalog));

  // FEW_SHOT coverage warning (preserved from earlier behaviour)
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
