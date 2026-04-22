import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  buildHelpBotSystemPrompt,
  buildBlockGenConversationPrompt,
  filterCatalog,
  getAllowedTypes,
} from '../systemPrompt';
import type { BlockCatalog } from '../systemPrompt';
import type { BoardDefinition } from '@/stores/boardStore';

const mockBoard: BoardDefinition = {
  id: 'esp32-generic',
  name: 'ESP32',
  fqbn: 'esp32:esp32:esp32',
  description: 'ESP32 generic',
  category: 'generic',
  supportsWifi: true,
  supportsOta: true,
  supportsBle: true,
  supportedFlashMethods: ['wifi', 'usb'],
};

const mockCatalog: BlockCatalog = {
  version: '1.0',
  generatedAt: '2026-04-22T00:00:00.000Z',
  blocks: [
    { type: 'arduino_setup', category: 'core',           tooltip: 'Setup',    modes: ['generic', 'robots_humanoid', 'all_blocks', 'custom'], boardRequires: null,           fields: [] },
    { type: 'humanoid_walk', category: 'robot_humanoid', tooltip: 'Walk',     modes: ['robots_humanoid', 'all_blocks', 'custom'],            boardRequires: null,           fields: [] },
    { type: 'ble_scan',      category: 'ble',            tooltip: 'BLE Scan', modes: ['generic', 'robots_humanoid', 'all_blocks', 'custom'], boardRequires: 'supportsBle',  fields: [] },
    { type: 'wifi_connect',  category: 'wifi',           tooltip: 'WiFi',     modes: ['generic', 'all_blocks', 'custom'],                    boardRequires: 'supportsWifi', fields: [] },
  ],
};

describe('buildSystemPrompt', () => {
  it('contains all 6 required section headers', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildSystemPrompt({ language: 'ja', mode: 'generic', board: mockBoard, filteredBlocks });
    expect(prompt).toContain('# Role');
    expect(prompt).toContain('# Output Format');
    expect(prompt).toContain('# Available Block Types');
    expect(prompt).toContain('# Examples');
    expect(prompt).toContain('# Current Context');
    expect(prompt).toContain('# Prohibitions');
  });

  it('includes existingXml in context when provided', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const existingXml = '<xml xmlns="https://developers.google.com/blockly/xml"></xml>';
    const prompt = buildSystemPrompt({ language: 'en', mode: 'generic', board: mockBoard, existingXml, filteredBlocks });
    expect(prompt).toContain('Existing workspace XML:');
    expect(prompt).toContain(existingXml);
  });

  it('omits existingXml section when not provided', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildSystemPrompt({ language: 'en', mode: 'generic', board: mockBoard, filteredBlocks });
    expect(prompt).not.toContain('Existing workspace XML:');
  });
});

describe('filterCatalog（全ブロック返却、判断 16 付随）', () => {
  it('returns all blocks when called with no mode or board', () => {
    const filtered = filterCatalog(mockCatalog);
    expect(filtered).toHaveLength(mockCatalog.blocks.length);
  });

  it('returns all blocks even when mode is provided', () => {
    const filtered = filterCatalog(mockCatalog, 'generic');
    expect(filtered).toHaveLength(mockCatalog.blocks.length);
    const types = filtered.map(b => b.type);
    expect(types).toContain('humanoid_walk');
    expect(types).toContain('wifi_connect');
  });

  it('returns all blocks even when mode and board are provided', () => {
    const noWifiBoard = { ...mockBoard, supportsWifi: false };
    const filtered = filterCatalog(mockCatalog, 'generic', noWifiBoard);
    expect(filtered).toHaveLength(mockCatalog.blocks.length);
    expect(filtered.map(b => b.type)).toContain('wifi_connect');
  });
});

describe('getAllowedTypes', () => {
  it('returns a Set of all type strings from blocks', () => {
    const filtered = filterCatalog(mockCatalog);
    const types = getAllowedTypes(filtered);
    expect(types).toBeInstanceOf(Set);
    expect(types.has('arduino_setup')).toBe(true);
    expect(types.has('humanoid_walk')).toBe(true);
    expect(types.has('wifi_connect')).toBe(true);
    expect(types.has('ble_scan')).toBe(true);
  });
});

describe('buildHelpBotSystemPrompt', () => {
  it('contains all 5 required sections', () => {
    const prompt = buildHelpBotSystemPrompt({ language: 'ja', mode: 'generic', board: mockBoard });
    expect(prompt).toContain('# Role');
    expect(prompt).toContain('# Response Style');
    expect(prompt).toContain('# Current Context');
    expect(prompt).toContain('# Prohibitions');
    expect(prompt).toContain('# Tab Switching Hint');
  });

  it('includes board and mode in context', () => {
    const prompt = buildHelpBotSystemPrompt({ language: 'en', mode: 'generic', board: mockBoard });
    expect(prompt).toContain('Board: ESP32');
    expect(prompt).toContain('Mode: generic');
  });

  it('omits current context section when neither mode nor board is provided', () => {
    const prompt = buildHelpBotSystemPrompt({ language: 'ja' });
    expect(prompt).not.toContain('# Current Context');
  });

  it('does not contain few-shot examples', () => {
    const prompt = buildHelpBotSystemPrompt({ language: 'ja', mode: 'generic', board: mockBoard });
    expect(prompt).not.toContain('## Example 1:');
    expect(prompt).not.toContain('## Example 2:');
  });
});

describe('buildBlockGenConversationPrompt', () => {
  it('contains role and context sections', () => {
    const prompt = buildBlockGenConversationPrompt({ language: 'ja', mode: 'generic', board: mockBoard });
    expect(prompt).toContain('# Role');
    expect(prompt).toContain('# Current Context');
    expect(prompt).toContain('Board: ESP32');
    expect(prompt).toContain('Mode: generic');
  });

  it('does not contain xml output format or prohibitions', () => {
    const prompt = buildBlockGenConversationPrompt({ language: 'ja', mode: 'generic', board: mockBoard });
    expect(prompt).not.toContain('# Output Format');
    expect(prompt).not.toContain('# Prohibitions');
  });

  it('does not contain few-shot examples', () => {
    const prompt = buildBlockGenConversationPrompt({ language: 'en', mode: 'generic', board: mockBoard });
    expect(prompt).not.toContain('## Example 1:');
  });
});
