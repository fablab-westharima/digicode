import type { RobotMode } from '@/stores/robotModeStore';
import type { BoardDefinition } from '@/stores/boardStore';
import { AI_SYSTEM_PROMPTS } from '@/data/aiSystemPrompts';
import type { AiLanguage } from '@/data/aiSystemPrompts';
import { sampleProjects } from '@/data/sampleProjects';

export interface BlockCatalogEntry {
  type: string;
  category: string;
  tooltip: string;
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

export function filterCatalog(
  catalog: BlockCatalog,
  mode: RobotMode,
  board: BoardDefinition,
): BlockCatalogEntry[] {
  return catalog.blocks.filter(b => {
    if (!b.modes.includes(mode)) return false;
    if (b.boardRequires === 'supportsWifi' && !board.supportsWifi) return false;
    if (b.boardRequires === 'supportsOta'  && !board.supportsOta)  return false;
    if (b.boardRequires === 'supportsBle'  && !board.supportsBle)  return false;
    return true;
  });
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

export function buildSystemPrompt(ctx: SystemPromptContext): string {
  const templates = AI_SYSTEM_PROMPTS[ctx.language];
  const blockTypeList = ctx.filteredBlocks.map(b => b.type).join(', ');

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
    `# Available Block Types (mode: ${ctx.mode}, board: ${ctx.board.name})\n${blockTypeList}`,
    `# Examples\n${getFewShotExamples(ctx.mode)}`,
    `# Current Context\n${contextLines.join('\n')}`,
    `# Prohibitions\n${templates.prohibitions}`,
  ].join('\n\n');
}
