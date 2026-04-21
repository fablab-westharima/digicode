import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, filterCatalog, getAllowedTypes } from '../systemPrompt';
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
    { type: 'arduino_setup', category: 'core',         tooltip: 'Setup',    modes: ['generic', 'robots_humanoid', 'all_blocks', 'custom'], boardRequires: null,           fields: [] },
    { type: 'humanoid_walk', category: 'robot_humanoid', tooltip: 'Walk',   modes: ['robots_humanoid', 'all_blocks', 'custom'],            boardRequires: null,           fields: [] },
    { type: 'ble_scan',      category: 'ble',          tooltip: 'BLE Scan', modes: ['generic', 'robots_humanoid', 'all_blocks', 'custom'], boardRequires: 'supportsBle',  fields: [] },
    { type: 'wifi_connect',  category: 'wifi',         tooltip: 'WiFi',     modes: ['generic', 'all_blocks', 'custom'],                    boardRequires: 'supportsWifi', fields: [] },
  ],
};

describe('buildSystemPrompt', () => {
  it('contains all 6 required section headers', () => {
    const filteredBlocks = filterCatalog(mockCatalog, 'generic', mockBoard);
    const prompt = buildSystemPrompt({ language: 'ja', mode: 'generic', board: mockBoard, filteredBlocks });

    expect(prompt).toContain('# Role');
    expect(prompt).toContain('# Output Format');
    expect(prompt).toContain('# Available Block Types');
    expect(prompt).toContain('# Examples');
    expect(prompt).toContain('# Current Context');
    expect(prompt).toContain('# Prohibitions');
  });

  it('includes existingXml in context when provided', () => {
    const filteredBlocks = filterCatalog(mockCatalog, 'generic', mockBoard);
    const existingXml = '<xml xmlns="https://developers.google.com/blockly/xml"></xml>';
    const prompt = buildSystemPrompt({ language: 'en', mode: 'generic', board: mockBoard, existingXml, filteredBlocks });
    expect(prompt).toContain('Existing workspace XML:');
    expect(prompt).toContain(existingXml);
  });

  it('omits existingXml section when not provided', () => {
    const filteredBlocks = filterCatalog(mockCatalog, 'generic', mockBoard);
    const prompt = buildSystemPrompt({ language: 'en', mode: 'generic', board: mockBoard, filteredBlocks });
    expect(prompt).not.toContain('Existing workspace XML:');
  });
});

describe('filterCatalog', () => {
  it('excludes blocks whose mode does not match', () => {
    const filtered = filterCatalog(mockCatalog, 'generic', mockBoard);
    const types = filtered.map(b => b.type);
    expect(types).not.toContain('humanoid_walk');
    expect(types).toContain('arduino_setup');
  });

  it('excludes blocks that require supportsWifi when board has no WiFi', () => {
    const noWifiBoard = { ...mockBoard, supportsWifi: false };
    const filtered = filterCatalog(mockCatalog, 'generic', noWifiBoard);
    const types = filtered.map(b => b.type);
    expect(types).not.toContain('wifi_connect');
    expect(types).toContain('arduino_setup');
  });

  it('excludes blocks that require supportsBle when board has no BLE', () => {
    const noBleBoard = { ...mockBoard, supportsBle: false };
    const filtered = filterCatalog(mockCatalog, 'generic', noBleBoard);
    const types = filtered.map(b => b.type);
    expect(types).not.toContain('ble_scan');
  });
});

describe('getAllowedTypes', () => {
  it('returns a Set of type strings from filtered blocks', () => {
    const filtered = filterCatalog(mockCatalog, 'generic', mockBoard);
    const types = getAllowedTypes(filtered);
    expect(types).toBeInstanceOf(Set);
    expect(types.has('arduino_setup')).toBe(true);
    expect(types.has('humanoid_walk')).toBe(false);
  });
});
