/**
 * generate-ai-block-catalog.ts
 *
 * Build-time script: reads toolboxGenerator.ts, boardStore.ts, and all
 * block definition files under src/blocks/arduino/, then writes
 * public/ai/block-catalog.json.
 *
 * Run via:  npx tsx scripts/generate-ai-block-catalog.ts
 * Auto-run: "prebuild" hook in package.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldDef {
  name: string;
  fieldType: 'number' | 'dropdown';
  default?: number | null;
  min?: number;
  max?: number;
  options?: string[];
}

interface BlockEntry {
  type: string;
  category: string;
  tooltip: string;
  colour: string;
  isStatement: boolean;
  hasOutput: boolean;
  modes: string[];
  boardRequires: string | null;
  builtin?: true;
  fields: FieldDef[];
}

interface BoardInfo {
  id: string;
  name: string;
  supportsWifi: boolean;
  supportsOta: boolean;
  supportsBle: boolean;
}

interface BlockCatalog {
  version: string;
  generatedAt: string;
  blocks: BlockEntry[];
  boardFilters: { wifi: string[]; ota: string[]; ble: string[] };
  boards: BoardInfo[];
}

interface BlockMeta {
  tooltip: string;
  colour: string;
  isStatement: boolean;
  hasOutput: boolean;
  fields: FieldDef[];
}

// ---------------------------------------------------------------------------
// i18n fallback: mirrors blocklyMessages.ts flattenTranslations logic
// ---------------------------------------------------------------------------

function flattenI18n(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}_${key}` : key;
    if (typeof value === 'string') result[newKey.toUpperCase()] = value;
    else if (typeof value === 'object' && value !== null)
      Object.assign(result, flattenI18n(value as Record<string, unknown>, newKey));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.join(__dirname, '..');
const TOOLBOX_PATH = path.join(FRONTEND_DIR, 'src/components/editor/toolboxGenerator.ts');
const BOARD_STORE_PATH = path.join(FRONTEND_DIR, 'src/stores/boardStore.ts');
const BLOCKS_DIR = path.join(FRONTEND_DIR, 'src/blocks/arduino');
const OUTPUT_PATH = path.join(FRONTEND_DIR, 'public/ai/block-catalog.json');

// ---------------------------------------------------------------------------
// Blockly built-in block tooltips
// ---------------------------------------------------------------------------

const BUILTIN_TOOLTIPS: Record<string, string> = {
  controls_if: 'If condition is true, execute the statements inside',
  controls_ifelse: 'If condition is true, execute first block; otherwise second block',
  logic_compare: 'Compare two values: EQ, NEQ, LT, LTE, GT, GTE',
  logic_operation: 'Logical AND or OR between two boolean values',
  logic_negate: 'Logical NOT — invert a boolean value',
  logic_boolean: 'Boolean constant: TRUE or FALSE',
  logic_ternary: 'Ternary: if test is true, return valueA; otherwise valueB',
  controls_repeat_ext: 'Repeat the enclosed statements N times',
  controls_whileUntil: 'Repeat statements while (or until) a condition is true',
  controls_for: 'Count-based loop: variable iterates from start to end by step',
  controls_flow_statements: 'Break out of or continue to the next iteration of a loop',
  math_number: 'A numeric constant',
  math_arithmetic: 'Arithmetic: add (+), subtract (-), multiply (*), divide (/)',
  math_random_int: 'Random integer between min and max (inclusive)',
  math_modulo: 'Remainder after dividing dividend by divisor',
  math_constrain: 'Clamp a value so it stays between low and high',
  math_round: 'Round a number (round / ceil / floor)',
  math_single: 'Single-operand math: abs, sqrt, sin, cos, tan, etc.',
  math_map: 'Re-map a number from one range to another (Arduino map function)',
  text: 'A literal text string',
  text_join: 'Concatenate two or more text strings',
  text_length: 'Number of characters in a text string',
  array_create: 'Declare a C++ array with a given type and size',
  array_set: 'Set an element in an array at a given index',
  array_get: 'Get the value of an array element at a given index',
  array_size: 'Get the number of elements in an array',
  array_content: 'Create an array with explicit element values',
};

// ---------------------------------------------------------------------------
// Step 1: Parse toolboxGenerator.ts → categoryBlocks
// ---------------------------------------------------------------------------

/**
 * Extracts a map of { categoryKey → [blockType, ...] } by scanning the
 * template-literal XML strings inside getToolboxCategories().
 */
function parseCategoryBlocks(content: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const lines = content.split('\n');
  let inTemplate = false;
  let currentKey = '';
  let accumulated = '';

  for (const line of lines) {
    if (!inTemplate) {
      // Match:  <word>: `<rest of line>
      const m = line.match(/^\s+(\w+):\s*`(.*)$/);
      if (!m) continue;
      currentKey = m[1];
      accumulated = m[2];
      // Single-line if the rest already contains a closing backtick
      if (accumulated.includes('`')) {
        extractAndStore(currentKey, accumulated, result);
        currentKey = '';
        accumulated = '';
      } else {
        inTemplate = true;
      }
    } else {
      accumulated += '\n' + line;
      if (line.includes('`')) {
        inTemplate = false;
        extractAndStore(currentKey, accumulated, result);
        currentKey = '';
        accumulated = '';
      }
    }
  }

  return result;
}

function extractAndStore(
  key: string,
  xml: string,
  out: Record<string, string[]>
): void {
  const types: string[] = [];
  const re = /<block type="(\w+)">/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) types.push(m[1]);
  if (types.length > 0) out[key] = types;
}

// ---------------------------------------------------------------------------
// Step 2: Parse toolboxGenerator.ts → modeCategories
// ---------------------------------------------------------------------------

/**
 * Extracts MODE_CATEGORY_ORDER as { modeKey → [categoryKey, ...] }.
 * Separator entries (separator1 … separator8) are removed.
 */
function parseModeCategories(content: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  const startIdx = content.indexOf('const MODE_CATEGORY_ORDER');
  if (startIdx === -1) return result;
  // The object ends at the first `\n};` after the start
  const endIdx = content.indexOf('\n};', startIdx);
  const section = endIdx !== -1 ? content.substring(startIdx, endIdx + 3) : content.substring(startIdx);

  // Match each mode array:  robots_humanoid: [\n    ...\n  ],
  const modeRe = /(\w+):\s*\[([\s\S]*?)\n  \]/g;
  let m: RegExpExecArray | null;
  while ((m = modeRe.exec(section)) !== null) {
    const modeKey = m[1];
    if (modeKey === 'Record') continue; // skip type annotation
    const cats = [...m[2].matchAll(/'(\w+)'/g)]
      .map(mm => mm[1])
      .filter(k => !/^separator/.test(k));
    result[modeKey] = cats;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Step 3: Parse toolboxGenerator.ts → boardFilters
// ---------------------------------------------------------------------------

function parseBoardFilters(
  content: string
): { wifi: string[]; ota: string[]; ble: string[] } {
  function extractSet(name: string): string[] {
    const re = new RegExp(`const ${name}\\s*=\\s*new Set\\(\\[([^\\]]+)\\]\\)`);
    const m = content.match(re);
    if (!m) return [];
    return [...m[1].matchAll(/'(\w+)'/g)].map(mm => mm[1]);
  }
  return {
    wifi: extractSet('WIFI_CATEGORIES'),
    ota: extractSet('OTA_CATEGORIES'),
    ble: extractSet('BLE_CATEGORIES'),
  };
}

// ---------------------------------------------------------------------------
// Step 4: Parse boardStore.ts → boards
// ---------------------------------------------------------------------------

function parseBoards(content: string): BoardInfo[] {
  const boards: BoardInfo[] = [];
  // Match each board object; [^}] also matches newlines (char class negation)
  const re =
    /\{\s*id:\s*'([^']+)'[^}]*name:\s*'([^']+)'[^}]*supportsWifi:\s*(true|false)[^}]*supportsOta:\s*(true|false)[^}]*supportsBle:\s*(true|false)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    boards.push({
      id: m[1],
      name: m[2],
      supportsWifi: m[3] === 'true',
      supportsOta: m[4] === 'true',
      supportsBle: m[5] === 'true',
    });
  }
  return boards;
}

// ---------------------------------------------------------------------------
// Step 5: Parse block definition files → block metadata
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

function parseBlockMeta(
  body: string,
  colorConstants: Record<string, string> = {},
  i18nMessages: Record<string, string> = {}
): BlockMeta {
  // Tooltip pass 1: extract || 'fallback' literal (handles both plain and `as any` cast forms)
  const tooltipM = body.match(/setTooltip\([^\n]*\|\|\s*['"](.+?)['"]\)/);
  let tooltip = tooltipM ? tooltipM[1] : '';

  // Tooltip pass 2: no fallback literal → look up Blockly.Msg key in i18n EN
  if (!tooltip) {
    const msgKeyM = body.match(/setTooltip\(\s*(?:\([^)]*\))?\s*Blockly\.Msg\.(\w+)\s*\)/);
    if (msgKeyM) tooltip = i18nMessages[msgKeyM[1]] ?? '';
  }

  // Colour: literal string first, then named constant (e.g. HUMANOID_COLOR)
  const colourLiteralM = body.match(/setColour\(['"]([^'"]+)['"]\)/);
  let colour = '#808080';
  if (colourLiteralM) {
    colour = colourLiteralM[1];
  } else {
    const colourVarM = body.match(/setColour\((\w+)\)/);
    if (colourVarM) colour = colorConstants[colourVarM[1]] ?? '#808080';
  }

  const isStatement = /setPreviousStatement\(true/.test(body);
  const hasOutput = /setOutput\(true/.test(body);

  const fields: FieldDef[] = [];

  // FieldNumber:  new Blockly.FieldNumber(default, min, max), 'NAME'
  const numRe = /new Blockly\.FieldNumber\(([^,)]+),\s*([^,)]+),\s*([^,)]+)\),\s*'(\w+)'/g;
  let fm: RegExpExecArray | null;
  while ((fm = numRe.exec(body)) !== null) {
    const defRaw = parseFloat(fm[1].trim());
    const minRaw = parseFloat(fm[2].trim());
    const maxRaw = parseFloat(fm[3].trim());
    fields.push({
      name: fm[4],
      fieldType: 'number',
      default: isNaN(defRaw) ? null : defRaw,
      min: isNaN(minRaw) ? undefined : minRaw,
      max: isNaN(maxRaw) ? undefined : maxRaw,
    });
  }

  // FieldDropdown: collect option VALUES (second element of each [label, value] pair)
  // Pattern:  new Blockly.FieldDropdown([...]), 'NAME'
  const ddRe = /new Blockly\.FieldDropdown\(\[([\s\S]*?)\]\),\s*'(\w+)'/g;
  while ((fm = ddRe.exec(body)) !== null) {
    const inner = fm[1];
    const fieldName = fm[2];
    // Each option: [..., 'VALUE']  or  [..., "VALUE"]
    const options = [...inner.matchAll(/,\s*['"]([^'"]+)['"]\s*\]/g)].map(mm => mm[1]);
    if (options.length > 0) {
      fields.push({ name: fieldName, fieldType: 'dropdown', options });
    }
  }

  return { tooltip, colour, isStatement, hasOutput, fields };
}

function parseAllBlockMeta(
  blocksDir: string,
  i18nMessages: Record<string, string>
): Map<string, BlockMeta> {
  const map = new Map<string, BlockMeta>();
  for (const file of getBlockFiles(blocksDir)) {
    const content = fs.readFileSync(file, 'utf-8');

    // Extract named color constants: const HUMANOID_COLOR = '#FF6B35'
    const colorConstants: Record<string, string> = {};
    const colorConstRe = /const\s+(\w+)\s*=\s*'(#[0-9A-Fa-f]{3,8})'/g;
    let ccm: RegExpExecArray | null;
    while ((ccm = colorConstRe.exec(content)) !== null) {
      colorConstants[ccm[1]] = ccm[2];
    }

    // Split on each block registration
    const re = /Blockly\.Blocks\['(\w+)'\]\s*=\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const blockType = m[1];
      const bodyStart = m.index;
      const nextStart = content.indexOf("\nBlockly.Blocks['", bodyStart + 10);
      const body = nextStart !== -1
        ? content.substring(bodyStart, nextStart)
        : content.substring(bodyStart);
      map.set(blockType, parseBlockMeta(body, colorConstants, i18nMessages));
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log('🔧 Generating AI block catalog...');

  const toolboxContent = fs.readFileSync(TOOLBOX_PATH, 'utf-8');
  const boardStoreContent = fs.readFileSync(BOARD_STORE_PATH, 'utf-8');

  // Load EN i18n for tooltip fallback (mirrors blocklyMessages.ts logic)
  const i18nEnPath = path.join(FRONTEND_DIR, 'src/i18n/locales/en.json');
  const i18nMessages = flattenI18n(
    JSON.parse(fs.readFileSync(i18nEnPath, 'utf-8')) as Record<string, unknown>
  );

  const categoryBlocks = parseCategoryBlocks(toolboxContent);
  const modeCategories = parseModeCategories(toolboxContent);
  const boardFilters = parseBoardFilters(toolboxContent);
  const boards = parseBoards(boardStoreContent);
  const blockMeta = parseAllBlockMeta(BLOCKS_DIR, i18nMessages);

  // Build category → boardRequires map
  const boardRequiresMap: Record<string, string | null> = {};
  for (const cat of boardFilters.wifi) boardRequiresMap[cat] = 'supportsWifi';
  for (const cat of boardFilters.ota) boardRequiresMap[cat] = 'supportsOta';
  for (const cat of boardFilters.ble) boardRequiresMap[cat] = 'supportsBle';

  // Accumulate blocks; each block may appear in multiple modes
  const blockMap = new Map<string, BlockEntry>();

  for (const [mode, categories] of Object.entries(modeCategories)) {
    for (const catKey of categories) {
      if (catKey === 'favorite_settings') continue; // UI-only, skip
      const blockTypes = categoryBlocks[catKey] ?? [];
      const boardRequires = boardRequiresMap[catKey] ?? null;

      for (const blockType of blockTypes) {
        const existing = blockMap.get(blockType);
        if (existing) {
          if (!existing.modes.includes(mode)) existing.modes.push(mode);
          continue;
        }

        const meta = blockMeta.get(blockType);
        const isBuiltin = meta === undefined;

        const entry: BlockEntry = {
          type: blockType,
          category: catKey,
          tooltip: meta?.tooltip || BUILTIN_TOOLTIPS[blockType] || '',
          colour: meta?.colour ?? '#808080',
          isStatement: meta?.isStatement ?? true,
          hasOutput: meta?.hasOutput ?? false,
          modes: [mode],
          boardRequires,
          fields: meta?.fields ?? [],
        };
        if (isBuiltin) entry.builtin = true;

        blockMap.set(blockType, entry);
      }
    }
  }

  const catalog: BlockCatalog = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    blocks: Array.from(blockMap.values()),
    boardFilters,
    boards,
  };

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalog, null, 2), 'utf-8');

  // Stats
  const total = catalog.blocks.length;
  const custom = catalog.blocks.filter(b => !b.builtin).length;
  const builtin = catalog.blocks.filter(b => b.builtin).length;
  const fileBytes = fs.statSync(OUTPUT_PATH).size;
  const modeCount = Object.keys(modeCategories).length;

  console.log(`✅ Generated: ${OUTPUT_PATH}`);
  console.log(`   Blocks: ${total} total (${custom} DigiCode + ${builtin} built-in)`);
  console.log(`   Modes: ${modeCount}  Boards: ${boards.length}`);
  console.log(`   File size: ${(fileBytes / 1024).toFixed(1)} KB`);
}

main();
