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
  supportsEspNow: true,
  supportsHallSensor: false,
  supportedFlashMethods: ['wifi', 'usb'],
};

const mockCatalog: BlockCatalog = {
  version: '1.0',
  generatedAt: '2026-04-22T00:00:00.000Z',
  blocks: [
    {
      type: 'arduino_setup', category: 'core', tooltip: 'Setup',
      isStatement: false, hasOutput: false,
      modes: ['all_blocks', 'robotics', 'all_blocks', 'custom'], boardRequires: null,
      fields: [], valueInputs: [], statementInputs: [{ name: 'SETUP' }],
    },
    {
      type: 'humanoid_walk', category: 'robot_humanoid', tooltip: 'Walk',
      isStatement: true, hasOutput: false,
      modes: ['robotics', 'all_blocks', 'custom'], boardRequires: null,
      fields: [], valueInputs: [], statementInputs: [],
    },
    {
      type: 'ble_scan', category: 'ble', tooltip: 'BLE Scan',
      isStatement: true, hasOutput: false,
      modes: ['all_blocks', 'robotics', 'all_blocks', 'custom'], boardRequires: 'supportsBle',
      fields: [], valueInputs: [], statementInputs: [],
    },
    {
      type: 'wifi_connect', category: 'wifi', tooltip: 'WiFi',
      isStatement: true, hasOutput: false,
      modes: ['all_blocks', 'all_blocks', 'custom'], boardRequires: 'supportsWifi',
      fields: [
        { name: 'SSID',     fieldType: 'text', default: 'your_ssid',     isCredential: true as const },
        { name: 'PASSWORD', fieldType: 'text', default: 'your_password', isCredential: true as const },
      ],
      valueInputs: [], statementInputs: [],
    },
    {
      type: 'bmp280_read', category: 'sensor', tooltip: 'BMP280',
      isStatement: false, hasOutput: true,
      outputType: 'Number',
      modes: ['all_blocks', 'all_blocks', 'custom'], boardRequires: null,
      fields: [{ name: 'TYPE', fieldType: 'dropdown', options: ['temp', 'pres'] }],
      valueInputs: [], statementInputs: [],
    },
    {
      type: 'esp32_delay', category: 'core', tooltip: 'Delay',
      isStatement: true, hasOutput: false,
      modes: ['all_blocks', 'all_blocks', 'custom'], boardRequires: null,
      fields: [], valueInputs: [{ name: 'TIME', check: 'Number' }], statementInputs: [],
    },
    // BUG-085 (第132回) — outputType notation 検証用 4 value block: String / Boolean /
    // null (dynamic, →Any として render) / 配列 (multi-type、→A|B として render)。
    {
      type: 'ws_recv_test', category: 'websocket', tooltip: 'WS receive test',
      isStatement: false, hasOutput: true,
      outputType: 'String',
      modes: ['all_blocks'], boardRequires: null,
      fields: [], valueInputs: [], statementInputs: [],
    },
    {
      type: 'cmp_test', category: 'logic', tooltip: 'Compare test',
      isStatement: false, hasOutput: true,
      outputType: 'Boolean',
      modes: ['all_blocks'], boardRequires: null,
      fields: [], valueInputs: [], statementInputs: [],
    },
    {
      type: 'variables_get_test', category: 'variables', tooltip: 'Get variable test',
      isStatement: false, hasOutput: true,
      outputType: null,
      modes: ['all_blocks'], boardRequires: null,
      fields: [{ name: 'VAR', fieldType: 'text' }], valueInputs: [], statementInputs: [],
    },
    {
      type: 'multi_type_test', category: 'core', tooltip: 'Multi type test',
      isStatement: false, hasOutput: true,
      outputType: ['Number', 'Boolean'],
      modes: ['all_blocks'], boardRequires: null,
      fields: [], valueInputs: [], statementInputs: [],
    },
  ],
};

describe('buildSystemPrompt', () => {
  it('contains all 7 required section headers (incl. BUG-086 Cross-Block Contracts)', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildSystemPrompt({ language: 'ja', mode: 'all_blocks', board: mockBoard, filteredBlocks, userPromptText: 'LEDを点滅させたい' });
    expect(prompt).toContain('# Role');
    expect(prompt).toContain('# Output Format');
    expect(prompt).toContain('# Available Block Types');
    expect(prompt).toContain('# Examples');
    expect(prompt).toContain('# Current Context');
    expect(prompt).toContain('# Prohibitions');
    expect(prompt).toContain('# Cross-Block Contracts');
  });

  // BUG-086 Session 133: Cross-Block Contracts section auto-emitted from
  // CROSS_BLOCK_CONTRACTS registry. Per-protocol per-lang content is verified
  // in crossBlockContracts.test.ts; here we verify integration into buildSystemPrompt.
  it('Cross-Block Contracts section appears AFTER Prohibitions (last reinforcement)', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildSystemPrompt({ language: 'ja', mode: 'all_blocks', board: mockBoard, filteredBlocks, userPromptText: 'LED' });
    const prohibitionsIdx = prompt.indexOf('# Prohibitions');
    const contractsIdx = prompt.indexOf('# Cross-Block Contracts');
    expect(prohibitionsIdx).toBeGreaterThan(-1);
    expect(contractsIdx).toBeGreaterThan(prohibitionsIdx);
  });

  it.each(['ja', 'en', 'zh-TW', 'es', 'pt-PT'] as const)(
    'Cross-Block Contracts section is auto-emitted in lang=%s with all 10 protocols',
    (lang) => {
      const filteredBlocks = filterCatalog(mockCatalog);
      const prompt = buildSystemPrompt({ language: lang, mode: 'all_blocks', board: mockBoard, filteredBlocks, userPromptText: 't' });
      // All 10 registers must appear in the contract section
      expect(prompt).toContain('websocket_server_register');
      expect(prompt).toContain('ha_switch_create');
      expect(prompt).toContain('ha_number_create');
      expect(prompt).toContain('ha_light_create');
      expect(prompt).toContain('ha_light_create_rgb');
      expect(prompt).toContain('ha_fan_create');
      expect(prompt).toContain('ha_cover_create');
      expect(prompt).toContain('ha_button_create');
      expect(prompt).toContain('ha_scene_create');
      expect(prompt).toContain('mqtt_subscribe');
      // All corresponding handlers must appear too
      expect(prompt).toContain('websocket_server_on_message');
      expect(prompt).toContain('ha_switch_on_command');
      expect(prompt).toContain('ha_number_on_command');
      expect(prompt).toContain('ha_light_on_command');
      expect(prompt).toContain('ha_light_on_rgb_command');
      expect(prompt).toContain('ha_fan_on_command');
      expect(prompt).toContain('ha_cover_on_command');
      expect(prompt).toContain('ha_button_on_press');
      expect(prompt).toContain('ha_scene_on_command');
      expect(prompt).toContain('mqtt_on_message');
    },
  );

  it('groups blocks by connection shape (statement / value / hat)', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildSystemPrompt({ language: 'ja', mode: 'all_blocks', board: mockBoard, filteredBlocks, userPromptText: 'LEDを点滅させたい' });
    expect(prompt).toContain('## Statement blocks');
    expect(prompt).toContain('## Value blocks');
    expect(prompt).toContain('## Top-level hat blocks');
    // bmp280_read (hasOutput=true) must appear in value blocks section, not statement
    const valueIdx     = prompt.indexOf('## Value blocks');
    const statementIdx = prompt.indexOf('## Statement blocks');
    const bmpIdx       = prompt.indexOf('bmp280_read');
    expect(bmpIdx).toBeGreaterThan(valueIdx);
    expect(bmpIdx).toBeGreaterThan(statementIdx);
    // humanoid_walk (isStatement=true) must appear in statement blocks section
    const humanoidIdx = prompt.indexOf('humanoid_walk');
    expect(humanoidIdx).toBeGreaterThan(statementIdx);
    expect(humanoidIdx).toBeLessThan(valueIdx);
  });

  // BUG-085 (第132回): value block → output type notation in schema string.
  // Verifies that the formatBlockSchema function appends `→Type` for hasOutput=true
  // blocks, allowing AI to see what type each value block returns.
  it('value block schema includes →Type suffix for single-type output (BUG-085 B)', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildSystemPrompt({ language: 'ja', mode: 'all_blocks', board: mockBoard, filteredBlocks, userPromptText: 'test' });
    // bmp280_read outputType='Number' → schema: 'bmp280_read(TYPE:temp|pres)→Number'
    expect(prompt).toContain('bmp280_read(TYPE:temp|pres)→Number');
    // ws_recv_test outputType='String' → 'ws_recv_test→String'
    expect(prompt).toContain('ws_recv_test→String');
    // cmp_test outputType='Boolean' → 'cmp_test→Boolean'
    expect(prompt).toContain('cmp_test→Boolean');
  });

  it('value block schema renders →Any for null outputType (BUG-085 B dynamic)', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildSystemPrompt({ language: 'ja', mode: 'all_blocks', board: mockBoard, filteredBlocks, userPromptText: 'test' });
    // variables_get_test outputType=null → 'variables_get_test(VAR:text)→Any'
    expect(prompt).toContain('variables_get_test(VAR:text)→Any');
  });

  it('value block schema renders →A|B for array outputType (BUG-085 B multi-type)', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildSystemPrompt({ language: 'ja', mode: 'all_blocks', board: mockBoard, filteredBlocks, userPromptText: 'test' });
    // multi_type_test outputType=['Number','Boolean'] → 'multi_type_test→Number|Boolean'
    expect(prompt).toContain('multi_type_test→Number|Boolean');
  });

  it('statement / hat blocks do NOT receive →Type suffix (BUG-085 B)', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildSystemPrompt({ language: 'ja', mode: 'all_blocks', board: mockBoard, filteredBlocks, userPromptText: 'test' });
    // Schema notations should be followed by separator (`,` or ` `) or end-of-line, not `→`.
    // Use [^→\n]* to stop at line boundary or arrow.
    expect(prompt).not.toMatch(/humanoid_walk[^→\n]*?→/);  // humanoid_walk (statement)
    expect(prompt).not.toMatch(/wifi_connect[^→\n]*?→/);    // wifi_connect (statement)
    expect(prompt).not.toMatch(/ble_scan[^→\n]*?→/);        // ble_scan (statement)
    // esp32_delay (statement, has TIME input) — schema should be 'esp32_delay[TIME:Number]', no →
    expect(prompt).toContain('esp32_delay[TIME:Number]');
    expect(prompt).not.toMatch(/esp32_delay\[TIME:Number\]→/);
  });

  it('schema notation header mentions →Type (BUG-085 B legend)', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildSystemPrompt({ language: 'ja', mode: 'all_blocks', board: mockBoard, filteredBlocks, userPromptText: 'test' });
    expect(prompt).toContain('→OutputType');
    expect(prompt).toContain('→Any');
  });

  it('marks credential fields with ★ in the schema', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildSystemPrompt({ language: 'ja', mode: 'all_blocks', board: mockBoard, filteredBlocks, userPromptText: 'LEDを点滅させたい' });
    // wifi_connect has SSID and PASSWORD as credential fields
    expect(prompt).toContain('SSID:text★');
    expect(prompt).toContain('PASSWORD:text★');
    // The schema notation legend must be present
    expect(prompt).toContain('★ credential fields');
  });

  it('includes dropdown options in schema', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildSystemPrompt({ language: 'ja', mode: 'all_blocks', board: mockBoard, filteredBlocks, userPromptText: 'LEDを点滅させたい' });
    // bmp280_read has TYPE dropdown with temp|pres
    expect(prompt).toContain('TYPE:temp|pres');
  });

  it('includes value inputs and statement inputs in schema', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildSystemPrompt({ language: 'ja', mode: 'all_blocks', board: mockBoard, filteredBlocks, userPromptText: 'LEDを点滅させたい' });
    // esp32_delay has TIME value input with Number check
    expect(prompt).toContain('[TIME:Number]');
    // arduino_setup has SETUP statement input
    expect(prompt).toContain('{SETUP}');
  });

  it('includes existingXml in context when provided', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const existingXml = '<xml xmlns="https://developers.google.com/blockly/xml"></xml>';
    const prompt = buildSystemPrompt({ language: 'en', mode: 'all_blocks', board: mockBoard, existingXml, filteredBlocks, userPromptText: 'Make LED blink' });
    expect(prompt).toContain('Existing workspace XML:');
    expect(prompt).toContain(existingXml);
  });

  it('omits existingXml section when not provided', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildSystemPrompt({ language: 'en', mode: 'all_blocks', board: mockBoard, filteredBlocks, userPromptText: 'Make LED blink' });
    expect(prompt).not.toContain('Existing workspace XML:');
  });
});

describe('filterCatalog（全ブロック返却、判断 16 付随）', () => {
  it('returns all blocks when called with no mode or board', () => {
    const filtered = filterCatalog(mockCatalog);
    expect(filtered).toHaveLength(mockCatalog.blocks.length);
  });

  it('returns all blocks even when mode is provided', () => {
    const filtered = filterCatalog(mockCatalog, 'all_blocks');
    expect(filtered).toHaveLength(mockCatalog.blocks.length);
    const types = filtered.map(b => b.type);
    expect(types).toContain('humanoid_walk');
    expect(types).toContain('wifi_connect');
  });

  it('returns all blocks even when mode and board are provided', () => {
    const noWifiBoard = { ...mockBoard, supportsWifi: false };
    const filtered = filterCatalog(mockCatalog, 'all_blocks', noWifiBoard);
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
    const prompt = buildHelpBotSystemPrompt({ language: 'ja', mode: 'all_blocks', board: mockBoard });
    expect(prompt).toContain('# Role');
    expect(prompt).toContain('# Response Style');
    expect(prompt).toContain('# Current Context');
    expect(prompt).toContain('# Prohibitions');
    expect(prompt).toContain('# Tab Switching Hint');
  });

  it('includes board and mode in context', () => {
    const prompt = buildHelpBotSystemPrompt({ language: 'en', mode: 'all_blocks', board: mockBoard });
    expect(prompt).toContain('Board: ESP32');
    expect(prompt).toContain('Mode: all_blocks');
  });

  it('omits current context section when neither mode nor board is provided', () => {
    const prompt = buildHelpBotSystemPrompt({ language: 'ja' });
    expect(prompt).not.toContain('# Current Context');
  });

  it('does not contain few-shot examples', () => {
    const prompt = buildHelpBotSystemPrompt({ language: 'ja', mode: 'all_blocks', board: mockBoard });
    expect(prompt).not.toContain('## Example 1:');
    expect(prompt).not.toContain('## Example 2:');
  });

  it('contains Available Blocks overview section when filteredBlocks is provided', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildHelpBotSystemPrompt({
      language: 'ja',
      mode: 'all_blocks',
      board: mockBoard,
      filteredBlocks,
    });
    expect(prompt).toContain('# Available Blocks (overview');
    expect(prompt).toContain('humanoid_walk: Walk');
    expect(prompt).toContain('wifi_connect: WiFi');
    expect(prompt).toContain('## core');
    expect(prompt).toContain('## sensor');
  });

  it('omits Available Blocks section when filteredBlocks is undefined (backward compat)', () => {
    const prompt = buildHelpBotSystemPrompt({ language: 'ja', mode: 'all_blocks', board: mockBoard });
    expect(prompt).not.toContain('# Available Blocks');
  });

  it('overview lines do not leak schema notation (no parens / brackets / braces)', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildHelpBotSystemPrompt({
      language: 'ja',
      mode: 'all_blocks',
      board: mockBoard,
      filteredBlocks,
    });
    const overviewStart = prompt.indexOf('# Available Blocks');
    expect(overviewStart).toBeGreaterThan(-1);
    const overview = prompt.slice(overviewStart);
    expect(overview).not.toMatch(/\(SSID:text/);
    expect(overview).not.toMatch(/\[TIME:Number\]/);
    expect(overview).not.toMatch(/\{SETUP\}/);
  });

  it('overview is placed before Prohibitions section (factual context before behavioral constraints)', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildHelpBotSystemPrompt({
      language: 'ja',
      mode: 'all_blocks',
      board: mockBoard,
      filteredBlocks,
    });
    const overviewIdx = prompt.indexOf('# Available Blocks');
    const prohibitionsIdx = prompt.indexOf('# Prohibitions');
    expect(overviewIdx).toBeGreaterThan(-1);
    expect(prohibitionsIdx).toBeGreaterThan(-1);
    expect(overviewIdx).toBeLessThan(prohibitionsIdx);
  });
});

describe('buildBlockGenConversationPrompt', () => {
  it('contains role and context sections', () => {
    const prompt = buildBlockGenConversationPrompt({ language: 'ja', mode: 'all_blocks', board: mockBoard });
    expect(prompt).toContain('# Role');
    expect(prompt).toContain('# Current Context');
    expect(prompt).toContain('Board: ESP32');
    expect(prompt).toContain('Mode: all_blocks');
  });

  it('does not contain xml output format or prohibitions', () => {
    const prompt = buildBlockGenConversationPrompt({ language: 'ja', mode: 'all_blocks', board: mockBoard });
    expect(prompt).not.toContain('# Output Format');
    expect(prompt).not.toContain('# Prohibitions');
  });

  it('does not contain few-shot examples', () => {
    const prompt = buildBlockGenConversationPrompt({ language: 'en', mode: 'all_blocks', board: mockBoard });
    expect(prompt).not.toContain('## Example 1:');
  });

  it('contains Available Blocks overview section when filteredBlocks is provided', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildBlockGenConversationPrompt({
      language: 'ja',
      mode: 'all_blocks',
      board: mockBoard,
      filteredBlocks,
    });
    expect(prompt).toContain('# Available Blocks (overview');
    expect(prompt).toContain('humanoid_walk: Walk');
    expect(prompt).toContain('wifi_connect: WiFi');
    expect(prompt).toContain('## core');
    expect(prompt).toContain('## sensor');
    expect(prompt).toContain('## wifi');
  });

  it('omits Available Blocks section when filteredBlocks is undefined (backward compat)', () => {
    const prompt = buildBlockGenConversationPrompt({ language: 'ja', mode: 'all_blocks', board: mockBoard });
    expect(prompt).not.toContain('# Available Blocks');
  });

  it('overview lines do not leak schema notation (no parens / brackets / braces from formatBlockSchema)', () => {
    const filteredBlocks = filterCatalog(mockCatalog);
    const prompt = buildBlockGenConversationPrompt({
      language: 'ja',
      mode: 'all_blocks',
      board: mockBoard,
      filteredBlocks,
    });
    // Extract the overview section to scope the check (avoid matching # Role / context / etc.)
    const overviewStart = prompt.indexOf('# Available Blocks');
    expect(overviewStart).toBeGreaterThan(-1);
    const overview = prompt.slice(overviewStart);
    // Schema markers from formatBlockSchema: (FIELD:type), [VALUE_INPUT], {STMT_INPUT}
    // Overview lines are "type: tooltip" and must not contain these markers.
    expect(overview).not.toMatch(/\(SSID:text/);
    expect(overview).not.toMatch(/\[TIME:Number\]/);
    expect(overview).not.toMatch(/\{SETUP\}/);
  });
});
