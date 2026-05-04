import type { RobotMode } from '@/stores/robotModeStore';
import type { BoardDefinition } from '@/stores/boardStore';
import type { WifiControllerSchema } from '@/components/editor/Controller/types';
import { AI_SYSTEM_PROMPTS } from '@/data/aiSystemPrompts';
import type { AiLanguage } from '@/data/aiSystemPrompts';
import { sampleProjects } from '@/data/sampleProjects';
import { selectFewShot } from './fewShotSelector';

export interface FieldDef {
  name: string;
  fieldType: 'number' | 'dropdown' | 'text' | 'checkbox' | 'angle';
  default?: number | string | boolean | null;
  min?: number;
  max?: number;
  options?: string[];
  isCredential?: true;
  isDynamic?: true;
}

export interface ValueInputDef {
  name: string;
  check: string | null;
}

export interface StatementInputDef {
  name: string;
}

export interface BlockCatalogEntry {
  type: string;
  category: string;
  tooltip: string;
  isStatement: boolean;
  hasOutput: boolean;
  modes: string[];
  boardRequires: string | null;
  fields: FieldDef[];
  valueInputs: ValueInputDef[];
  statementInputs: StatementInputDef[];
}

export interface BlockCatalog {
  version: string;
  generatedAt: string;
  blocks: BlockCatalogEntry[];
}

export interface SystemPromptContext {
  language: AiLanguage;
  mode: RobotMode;
  board: BoardDefinition;
  existingXml?: string;
  filteredBlocks: BlockCatalogEntry[];
  userPromptText: string;
}

export interface HelpBotSystemPromptContext {
  language: AiLanguage;
  mode?: RobotMode;
  board?: BoardDefinition;
  filteredBlocks?: BlockCatalogEntry[];
}

export interface BlockGenConversationContext {
  language: AiLanguage;
  mode?: RobotMode;
  board?: BoardDefinition;
  filteredBlocks?: BlockCatalogEntry[];
}

// 5000 文字超の既存 XML は切り詰め（MVP 制約）
const MAX_EXISTING_XML_LENGTH = 5000;

let catalogCache: BlockCatalog | null = null;

export async function fetchCatalog(): Promise<BlockCatalog> {
  if (catalogCache) return catalogCache;
  const response = await fetch('/ai/block-catalog.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch block catalog: ${response.status}`);
  }
  catalogCache = await response.json() as BlockCatalog;
  return catalogCache;
}

// 全ブロック返却（判断 16 付随: mode/board は optional で受け取るが無視、判断 2 + 5 確定）
export function filterCatalog(
  catalog: BlockCatalog,
  _mode?: RobotMode,
  _board?: BoardDefinition,
): BlockCatalogEntry[] {
  return catalog.blocks;
}

export function getAllowedTypes(blocks: BlockCatalogEntry[]): Set<string> {
  return new Set(blocks.map(b => b.type));
}

function getFewShotExamples(mode: RobotMode, userPromptText: string): string {
  const ids = selectFewShot(mode, userPromptText);
  const examples = ids
    .map(id => sampleProjects.find(s => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  return examples
    .map((s, i) => `## Example ${i + 1}: ${s.title}\n${s.blocklyXml.trim()}`)
    .join('\n\n');
}

/**
 * Format a block entry as a compact schema string for the AI system prompt.
 *
 * Notation:
 *   (NAME:type)       = field  (e.g. ADDR:0x76|0x77  or  KEY:text  or  SSID:text★)
 *   [NAME]            = value input slot (accepts sub-block)
 *   {NAME}            = statement input slot (accepts stacked blocks)
 *   ★                 = credential field — AI must NOT specify a value; block default will show
 */
function formatBlockSchema(b: BlockCatalogEntry): string {
  const fieldParts: string[] = [];
  for (const f of b.fields) {
    if (f.isCredential) {
      fieldParts.push(`${f.name}:text★`);
    } else if (f.fieldType === 'dropdown' && f.options && f.options.length > 0) {
      fieldParts.push(`${f.name}:${f.options.join('|')}`);
    } else if (f.fieldType === 'number') {
      const range = (f.min !== undefined && f.max !== undefined)
        ? `num(${f.min}–${f.max})`
        : 'num';
      fieldParts.push(`${f.name}:${range}`);
    } else if (f.fieldType === 'text') {
      fieldParts.push(`${f.name}:text`);
    } else if (f.fieldType === 'checkbox') {
      fieldParts.push(`${f.name}:bool`);
    } else if (f.fieldType === 'angle') {
      fieldParts.push(`${f.name}:angle`);
    }
  }

  const valueInputParts = b.valueInputs.map(vi =>
    vi.check ? `[${vi.name}:${vi.check}]` : `[${vi.name}]`
  );
  const stmtInputParts = b.statementInputs.map(si => `{${si.name}}`);

  const schema = [...(fieldParts.length ? [`(${fieldParts.join(',')})`] : []), ...valueInputParts, ...stmtInputParts].join('');
  return b.type + schema;
}

/**
 * Format a block entry as a one-liner overview for the conversation phase.
 * Schema (fields / inputs / connections) is intentionally omitted —
 * conversation = "what blocks exist", generation = "how to combine them".
 */
function formatBlockOverview(b: BlockCatalogEntry): string {
  const tooltip = (b.tooltip || '').trim() || '(no tooltip)';
  return `${b.type}: ${tooltip}`;
}

/**
 * Build a category-grouped overview block for the conversation phase.
 * Output shape:
 *   ## category
 *   - block_type: tooltip
 *   - block_type: tooltip
 *   ...
 */
function buildBlockOverviewSection(blocks: BlockCatalogEntry[]): string {
  const grouped = new Map<string, BlockCatalogEntry[]>();
  for (const b of blocks) {
    const cat = b.category || 'other';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(b);
  }
  const sortedCategories = Array.from(grouped.keys()).sort();
  return sortedCategories
    .map(cat => {
      const list = grouped.get(cat)!.map(b => `- ${formatBlockOverview(b)}`).join('\n');
      return `## ${cat}\n${list}`;
    })
    .join('\n\n');
}

// blockGen 生成フェーズ用（XML 出力制約あり、generateFromConversation で使用）
export function buildSystemPrompt(ctx: SystemPromptContext): string {
  const templates = AI_SYSTEM_PROMPTS[ctx.language].blockGen;

  // ブロックを接続形状別に分類し、それぞれのスキーマを付与する
  const statementBlocks = ctx.filteredBlocks.filter(b => b.isStatement && !b.hasOutput);
  const valueBlocks     = ctx.filteredBlocks.filter(b => b.hasOutput);
  const hatBlocks       = ctx.filteredBlocks.filter(b => !b.isStatement && !b.hasOutput);

  const blockTypeSection = [
    '## Statement blocks — stackable vertically, can have <next>/<previous>',
    statementBlocks.map(formatBlockSchema).join(', '),
    '## Value blocks — plug into <value> slots only; MUST NOT have <next>/<previous>',
    valueBlocks.map(formatBlockSchema).join(', '),
    '## Top-level hat blocks — use as root only (arduino_setup, arduino_loop)',
    hatBlocks.map(formatBlockSchema).join(', '),
    '## Schema notation: (FIELD:type★=credential) [VALUE_INPUT] {STMT_INPUT}',
    '## ★ credential fields: DO NOT specify values; omit them and the block shows safe defaults',
  ].join('\n');

  const contextLines = [
    `Board: ${ctx.board.name}`,
    `Mode: ${ctx.mode}`,
  ];
  if (ctx.existingXml) {
    const xml = ctx.existingXml.length > MAX_EXISTING_XML_LENGTH
      ? ctx.existingXml.slice(0, MAX_EXISTING_XML_LENGTH) + '...'
      : ctx.existingXml;
    contextLines.push(`Existing workspace XML:\n${xml}`);
  }

  return [
    `# Role\n${templates.role}`,
    `# Output Format\n${templates.outputLock}`,
    `# Available Block Types (mode: ${ctx.mode}, board: ${ctx.board.name})\n${blockTypeSection}`,
    `# Examples\n${getFewShotExamples(ctx.mode, ctx.userPromptText)}`,
    `# Current Context\n${contextLines.join('\n')}`,
    `# Prohibitions\n${templates.prohibitions}`,
  ].join('\n\n');
}

// HELP Bot 用（自由応答、XML 禁止、Few-shot なし、判断 11 Q-B）
// catalog overview を含むことで AI が DigiCode 固有ブロック type 名を正確に引用できる
// （pwm_set / pwm_write 等の hallucination を防止、S7 OpenAI で発覚した pre-existing 設計欠陥を解消）
export function buildHelpBotSystemPrompt(ctx: HelpBotSystemPromptContext): string {
  const templates = AI_SYSTEM_PROMPTS[ctx.language].helpBot;
  const contextLines = [
    ...(ctx.board ? [`Board: ${ctx.board.name}`] : []),
    ...(ctx.mode  ? [`Mode: ${ctx.mode}`]        : []),
  ];

  const sections = [
    `# Role\n${templates.role}`,
    `# Response Style\n${templates.style}`,
    ...(contextLines.length > 0 ? [`# Current Context\n${contextLines.join('\n')}`] : []),
  ];

  if (ctx.filteredBlocks && ctx.filteredBlocks.length > 0) {
    const overview = buildBlockOverviewSection(ctx.filteredBlocks);
    sections.push(
      `# Available Blocks (overview, no schema — refer to these exact type names; do not invent block names)\n${overview}`
    );
  }

  sections.push(
    `# Prohibitions\n${templates.xmlProhibition}`,
    `# Tab Switching Hint\n${templates.switchTabHint}`,
  );

  return sections.join('\n\n');
}

// Phase 4 controller customize 用 (50.md §7、第 2 層 Lite+ 課金差別化)。
// AI が WidgetCustomization optional fields のみの diff JSON を返す。
// schema を JSON.stringify で context 注入、size 圧迫対策で customCss 値が
// 4000 chars 超なら summary 化 (memory:investigation_incomplete_assumption
// で defense-in-depth、jsonValidator も独立に check)。
const MAX_SCHEMA_CONTEXT_CHARS = 8000;
const CUSTOM_CSS_SUMMARY_THRESHOLD = 200;

export interface ControllerCustomizePromptContext {
  language: AiLanguage;
  schema: WifiControllerSchema;
}

function trimSchemaForContext(schema: WifiControllerSchema): unknown {
  // Replace long customCss with size summary so AI sees structure but not bytes
  function summarizeCustomization<T extends { customCss?: string } | undefined>(
    c: T,
  ): T {
    if (!c || !c.customCss || c.customCss.length <= CUSTOM_CSS_SUMMARY_THRESHOLD) return c;
    return { ...c, customCss: `<custom CSS, ${c.customCss.length} chars>` } as T;
  }
  const trimmed: WifiControllerSchema = {
    ...schema,
    customization: summarizeCustomization(schema.customization),
    devices: schema.devices.map((d) => ({
      ...d,
      widgets: d.widgets.map((w) => summarizeCustomization(w) as typeof w),
    })),
  };
  // Hard size cap as last-resort guard (truncated JSON is invalid but the
  // alternative — sending 50KB+ — would blow the prompt budget)
  const json = JSON.stringify(trimmed, null, 2);
  if (json.length > MAX_SCHEMA_CONTEXT_CHARS) {
    return JSON.parse(json.slice(0, MAX_SCHEMA_CONTEXT_CHARS));
  }
  return trimmed;
}

export function buildControllerCustomizePrompt(ctx: ControllerCustomizePromptContext): string {
  const templates = AI_SYSTEM_PROMPTS[ctx.language].controllerCustomize;
  const schemaJson = JSON.stringify(trimSchemaForContext(ctx.schema), null, 2);

  return [
    `# Role\n${templates.role}`,
    `# Output Format\n${templates.outputLock}`,
    `# CustomizationDiff schema (TypeScript)\n` +
      'interface CustomizationDiff {\n' +
      '  schemaLevel?: WidgetCustomization;\n' +
      '  widgets?: Array<{ id: string } & WidgetCustomization>;\n' +
      '}\n' +
      'interface WidgetCustomization {\n' +
      "  displayMode?: 'plain' | 'gauge' | 'graph' | 'led';\n" +
      "  layout?: 'grid' | 'columns-2' | 'columns-3' | 'rows';\n" +
      '  colorScheme?: { bg?: string; fg?: string; accent?: string };  // CSS color\n' +
      '  customCss?: string;  // max 4000 chars\n' +
      '}',
    `# Current Schema (Layer 1 + previously applied Layer 2)\n` +
      '```json\n' + schemaJson + '\n```',
    `# Example output\n` +
      '```json\n' +
      JSON.stringify({
        schemaLevel: { layout: 'columns-2', colorScheme: { accent: '#2563eb' } },
        widgets: [{ id: 'temp', displayMode: 'gauge' }],
      }, null, 2) +
      '\n```',
    `# Prohibitions\n${templates.prohibitions}`,
  ].join('\n\n');
}

// blockGen 会話フェーズ用（XML 出力制約なし、仕様を対話で固める段階）
// catalog overview を含むことで AI が DigiCode 固有ブロックを把握できる
// （schema 詳細は生成フェーズの buildSystemPrompt 側で付与、役割分担）
export function buildBlockGenConversationPrompt(ctx: BlockGenConversationContext): string {
  const templates = AI_SYSTEM_PROMPTS[ctx.language].blockGen;
  const contextLines = [
    ...(ctx.board ? [`Board: ${ctx.board.name}`] : []),
    ...(ctx.mode  ? [`Mode: ${ctx.mode}`]        : []),
  ];

  const sections = [
    `# Role\n${templates.role}`,
    `# Response Style\n${templates.conversationStyle}`,
    ...(contextLines.length > 0 ? [`# Current Context\n${contextLines.join('\n')}`] : []),
  ];

  if (ctx.filteredBlocks && ctx.filteredBlocks.length > 0) {
    const overview = buildBlockOverviewSection(ctx.filteredBlocks);
    sections.push(
      `# Available Blocks (overview, no schema — schema is provided in the generation phase)\n${overview}`
    );
  }

  return sections.join('\n\n');
}
