import type { RobotMode } from '@/stores/robotModeStore';
import type { BoardDefinition } from '@/stores/boardStore';
import { AI_SYSTEM_PROMPTS } from '@/data/aiSystemPrompts';
import type { AiLanguage } from '@/data/aiSystemPrompts';
import { sampleProjects } from '@/data/sampleProjects';

export interface BlockCatalogEntry {
  type: string;
  category: string;
  tooltip: string;
  isStatement: boolean;
  hasOutput: boolean;
  modes: string[];
  boardRequires: string | null;
  fields: unknown[];
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
}

export interface HelpBotSystemPromptContext {
  language: AiLanguage;
  mode?: RobotMode;
  board?: BoardDefinition;
}

export interface BlockGenConversationContext {
  language: AiLanguage;
  mode?: RobotMode;
  board?: BoardDefinition;
}

// 5000 文字超の既存 XML は切り詰め（MVP 制約）
const MAX_EXISTING_XML_LENGTH = 5000;

// モードごとの Few-shot サンプル ID（sampleProjects.ts の id と対応）
const FEW_SHOT_MODE_IDS: Record<RobotMode, string[]> = {
  robots_humanoid:  ['humanoid-dance', 'led-blink', 'serial-hello'],
  robots_wheel:     ['wheel-obstacle', 'led-blink', 'serial-hello'],
  robots_transform: ['transform-ninja', 'led-blink', 'serial-hello'],
  homeassistant:    ['dht-sensor', 'led-blink', 'serial-hello'],
  generic:          ['led-blink', 'serial-hello', 'ultrasonic-distance'],
  all_blocks:       ['led-blink', 'serial-hello', 'ultrasonic-distance'],
  custom:           ['led-blink', 'serial-hello', 'ultrasonic-distance'],
};

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

function getFewShotExamples(mode: RobotMode): string {
  const ids = FEW_SHOT_MODE_IDS[mode] ?? FEW_SHOT_MODE_IDS.generic;
  const examples = ids
    .map(id => sampleProjects.find(s => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined)
    .slice(0, 3);

  return examples
    .map((s, i) => `## Example ${i + 1}: ${s.title}\n${s.blocklyXml.trim()}`)
    .join('\n\n');
}

// blockGen 生成フェーズ用（XML 出力制約あり、generateFromConversation で使用）
export function buildSystemPrompt(ctx: SystemPromptContext): string {
  const templates = AI_SYSTEM_PROMPTS[ctx.language].blockGen;

  // ブロックを接続形状別に分類（AI が誤った接続を生成しないよう明示）
  const statementBlocks = ctx.filteredBlocks.filter(b => b.isStatement && !b.hasOutput).map(b => b.type);
  const valueBlocks     = ctx.filteredBlocks.filter(b => b.hasOutput).map(b => b.type);
  const hatBlocks       = ctx.filteredBlocks.filter(b => !b.isStatement && !b.hasOutput).map(b => b.type);

  const blockTypeSection = [
    '## Statement blocks (stackable vertically, can have <next>/<previous> connections)',
    statementBlocks.join(', '),
    '## Value blocks (plug into <value> slots only, MUST NOT have <next>/<previous>)',
    valueBlocks.join(', '),
    '## Top-level hat blocks (no previous/next, use as root: arduino_setup, arduino_loop)',
    hatBlocks.join(', '),
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
    `# Examples\n${getFewShotExamples(ctx.mode)}`,
    `# Current Context\n${contextLines.join('\n')}`,
    `# Prohibitions\n${templates.prohibitions}`,
  ].join('\n\n');
}

// HELP Bot 用（自由応答、XML 禁止、Few-shot なし、判断 11 Q-B）
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
    `# Prohibitions\n${templates.xmlProhibition}`,
    `# Tab Switching Hint\n${templates.switchTabHint}`,
  ];

  return sections.join('\n\n');
}

// blockGen 会話フェーズ用（XML 出力制約なし、仕様を対話で固める段階）
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

  return sections.join('\n\n');
}
