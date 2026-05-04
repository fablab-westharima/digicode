/**
 * unifiedControllerBuilder tests (47.md Phase 3 / 48.md commit #2, §6.4).
 *
 * Pure-function tests — no Blockly setup, no actual bundle import. The
 * tests pass a tiny `bundleHtml` fixture that contains only the
 * `<script id="schema">` placeholder and a marker so we can assert
 * embed correctness without depending on the auto-generated module.
 *
 * Scenarios cover the seven cases enumerated in 48.md §6.4.
 */

import { describe, it, expect } from 'vitest';
import {
  buildUnifiedControllerHtml,
  uniquifyDeviceId,
  deriveDeviceId,
  type UnifiedDeviceInput,
} from '../unifiedControllerBuilder';

const FIXTURE_BUNDLE =
  '<!DOCTYPE html>\n<html><head>\n' +
  '<script id="schema" type="application/json">{}</script>\n' +
  '</head><body data-marker="ok"></body></html>';

function makeInput(overrides: Partial<UnifiedDeviceInput> = {}): UnifiedDeviceInput {
  // Minimal Blockly XML with a single websocket_server_register block —
  // produces a single gatt-toggle widget under inferWifiUiSchema's rules.
  const xml = `<xml xmlns="https://developers.google.com/blockly/xml">
    <block type="websocket_server_register">
      <field name="CHANNEL_ID">led</field>
      <field name="LABEL">LED</field>
      <field name="DATA_TYPE">bool</field>
      <field name="MIN">0</field>
      <field name="MAX">100</field>
      <field name="READ">FALSE</field>
      <field name="WRITE">TRUE</field>
      <field name="NOTIFY">FALSE</field>
    </block>
  </xml>`;
  return {
    projectTitle: 'My Project',
    blocklyXml: xml,
    deviceLabel: 'Test Device',
    deviceId: 'test-device',
    host: '192.168.1.42',
    port: 81,
    ...overrides,
  };
}

function readEmbeddedSchema(html: string): unknown {
  const m = html.match(
    /<script id="schema" type="application\/json">([^<]*)<\/script>/,
  );
  if (!m) throw new Error('embedded schema not found in html');
  // The builder escapes <, >, & to \uXXXX. JSON.parse decodes them.
  return JSON.parse(m[1]);
}

describe('buildUnifiedControllerHtml — empty input (48.md §6.4 case 1)', () => {
  it('produces a schema with no devices and no warnings', () => {
    const result = buildUnifiedControllerHtml([], { bundleHtml: FIXTURE_BUNDLE });
    expect(result.schema.connection).toBe('wifi');
    expect(result.schema.version).toBe('1.0');
    expect(result.schema.devices).toEqual([]);
    expect(result.schema.warnings).toEqual([]);
    const embedded = readEmbeddedSchema(result.html) as { devices: unknown[] };
    expect(embedded.devices).toEqual([]);
  });
});

describe('buildUnifiedControllerHtml — single device (48.md §6.4 case 2, Phase 2 symmetry)', () => {
  it('produces length=1 schema with overridden deviceLabel / deviceId / host / port', () => {
    const result = buildUnifiedControllerHtml(
      [makeInput({ deviceLabel: 'Room A', deviceId: 'room-a', host: '10.0.0.1', port: 8081 })],
      { bundleHtml: FIXTURE_BUNDLE },
    );
    expect(result.schema.devices).toHaveLength(1);
    const d = result.schema.devices[0];
    expect(d.deviceLabel).toBe('Room A');
    expect(d.deviceId).toBe('room-a');
    expect(d.endpoint.host).toBe('10.0.0.1');
    expect(d.endpoint.port).toBe(8081);
    expect(d.endpoint.path).toBe('/');
    // Widget inferred from the websocket_server_register block (bool + WRITE = toggle)
    expect(d.widgets).toHaveLength(1);
    expect(d.widgets[0].type).toBe('gatt-toggle');
  });

  it('falls back to default port=81 when port is missing or invalid', () => {
    const result = buildUnifiedControllerHtml(
      [makeInput({ port: NaN })],
      { bundleHtml: FIXTURE_BUNDLE },
    );
    expect(result.schema.devices[0].endpoint.port).toBe(81);
  });
});

describe('buildUnifiedControllerHtml — three devices (48.md §6.4 case 3)', () => {
  it('preserves input order and produces length=3 schema', () => {
    const result = buildUnifiedControllerHtml(
      [
        makeInput({ deviceId: 'a', deviceLabel: 'A', host: '1.1.1.1' }),
        makeInput({ deviceId: 'b', deviceLabel: 'B', host: '2.2.2.2' }),
        makeInput({ deviceId: 'c', deviceLabel: 'C', host: '3.3.3.3' }),
      ],
      { bundleHtml: FIXTURE_BUNDLE },
    );
    expect(result.schema.devices.map((d) => d.deviceId)).toEqual(['a', 'b', 'c']);
    expect(result.schema.devices.map((d) => d.endpoint.host)).toEqual([
      '1.1.1.1',
      '2.2.2.2',
      '3.3.3.3',
    ]);
  });
});

describe('uniquifyDeviceId — collision resolution (48.md §6.4 case 4 + §6.3)', () => {
  it('returns base when not used', () => {
    expect(uniquifyDeviceId('led', new Set())).toBe('led');
  });

  it('appends -2, -3, ... to resolve collisions', () => {
    const used = new Set<string>(['led']);
    const next = uniquifyDeviceId('led', used);
    expect(next).toBe('led-2');
    used.add(next);
    expect(uniquifyDeviceId('led', used)).toBe('led-3');
  });

  it('falls back to "device" when base is empty', () => {
    expect(uniquifyDeviceId('', new Set())).toBe('device');
  });
});

describe('deriveDeviceId — sanitize project titles (helper used by Section)', () => {
  it('lowercases, replaces non-alphanumerics with -, trims', () => {
    expect(deriveDeviceId('My Project')).toBe('my-project');
    expect(deriveDeviceId('部屋 A の照明')).toBe('a');
    expect(deriveDeviceId('   ')).toBe('device');
    expect(deriveDeviceId('Hello!@#World')).toBe('hello-world');
  });
});

describe('buildUnifiedControllerHtml — malformed XML (48.md §6.4 case 5)', () => {
  it('produces empty widgets when blocklyXml is unparseable', () => {
    const result = buildUnifiedControllerHtml(
      [makeInput({ blocklyXml: 'this is not xml at all <<<>>>' })],
      { bundleHtml: FIXTURE_BUNDLE },
    );
    expect(result.schema.devices).toHaveLength(1);
    // extractWsServerDataFromXml returns { registrations: [] } on parse error
    // → inferWifiUiSchema produces a device with no widgets and no warnings.
    expect(result.schema.devices[0].widgets).toEqual([]);
  });

  it('produces empty widgets and 0 widgets when blocklyXml is empty string', () => {
    const result = buildUnifiedControllerHtml(
      [makeInput({ blocklyXml: '' })],
      { bundleHtml: FIXTURE_BUNDLE },
    );
    expect(result.schema.devices[0].widgets).toEqual([]);
  });
});

describe('buildUnifiedControllerHtml — warnings get [deviceLabel] prefix (48.md §6.4 case 6 / C4)', () => {
  it('prefixes inferWifiUiSchema warnings with the human-readable device label', () => {
    // Two registrations with the same channel id — inferWifiUiSchema warns
    // about the duplicate. Both warnings should be prefixed with `[Room A]`.
    const xml = `<xml xmlns="https://developers.google.com/blockly/xml">
      <block type="websocket_server_register">
        <field name="CHANNEL_ID">led</field>
        <field name="LABEL">LED</field>
        <field name="DATA_TYPE">bool</field>
        <field name="MIN">0</field>
        <field name="MAX">1</field>
        <field name="READ">FALSE</field>
        <field name="WRITE">TRUE</field>
        <field name="NOTIFY">FALSE</field>
      </block>
      <block type="websocket_server_register">
        <field name="CHANNEL_ID">led</field>
        <field name="LABEL">LED dup</field>
        <field name="DATA_TYPE">bool</field>
        <field name="MIN">0</field>
        <field name="MAX">1</field>
        <field name="READ">FALSE</field>
        <field name="WRITE">TRUE</field>
        <field name="NOTIFY">FALSE</field>
      </block>
    </xml>`;
    const result = buildUnifiedControllerHtml(
      [makeInput({ deviceLabel: 'Room A', blocklyXml: xml })],
      { bundleHtml: FIXTURE_BUNDLE },
    );
    expect(result.schema.warnings.length).toBeGreaterThan(0);
    for (const w of result.schema.warnings) {
      expect(w).toMatch(/^\[Room A\]/);
    }
  });
});

describe('buildUnifiedControllerHtml — host explicit override (48.md §6.4 case 7)', () => {
  it('writes the user-supplied host into endpoint.host', () => {
    const result = buildUnifiedControllerHtml(
      [makeInput({ host: '192.168.1.42' })],
      { bundleHtml: FIXTURE_BUNDLE },
    );
    expect(result.schema.devices[0].endpoint.host).toBe('192.168.1.42');
  });

  it('embeds the schema into the bundle HTML and survives JSON.parse', () => {
    const result = buildUnifiedControllerHtml(
      [makeInput({ host: '192.168.1.42', deviceLabel: 'A < B & C > D' })],
      { bundleHtml: FIXTURE_BUNDLE },
    );
    const embedded = readEmbeddedSchema(result.html) as {
      devices: { deviceLabel: string; endpoint: { host: string } }[];
    };
    expect(embedded.devices[0].endpoint.host).toBe('192.168.1.42');
    // HTML-special characters in the label survive the escape/parse round-trip.
    expect(embedded.devices[0].deviceLabel).toBe('A < B & C > D');
  });

  it('throws when bundleHtml is missing the schema placeholder', () => {
    expect(() =>
      buildUnifiedControllerHtml([makeInput()], {
        bundleHtml: '<html><body>no placeholder</body></html>',
      }),
    ).toThrow(/missing <script id="schema"> placeholder/);
  });
});

describe('buildUnifiedControllerHtml — Phase 4 customizationDiffs (BUG-076 fix)', () => {
  it('case 8: customizationDiffs are applied onto the embedded schema', () => {
    const result = buildUnifiedControllerHtml([makeInput()], {
      bundleHtml: FIXTURE_BUNDLE,
      customizationDiffs: [
        {
          schemaLevel: { layout: 'columns-2', colorScheme: { accent: '#2563eb' } },
          widgets: [{ id: 'led', colorScheme: { bg: '#1e293b' } }],
        },
      ],
    });
    const embedded = readEmbeddedSchema(result.html) as {
      customization?: { layout?: string; colorScheme?: { accent?: string } };
      devices: Array<{ widgets: Array<{ id: string; colorScheme?: { bg?: string } }> }>;
    };
    // schema-level customization populated
    expect(embedded.customization?.layout).toBe('columns-2');
    expect(embedded.customization?.colorScheme?.accent).toBe('#2563eb');
    // widget-level customization merged onto matching widget id
    expect(embedded.devices[0].widgets[0].id).toBe('led');
    expect(embedded.devices[0].widgets[0].colorScheme?.bg).toBe('#1e293b');
  });

  it('omitting customizationDiffs preserves backward-compat (no customization in schema)', () => {
    const result = buildUnifiedControllerHtml([makeInput()], {
      bundleHtml: FIXTURE_BUNDLE,
    });
    const embedded = readEmbeddedSchema(result.html) as {
      customization?: unknown;
    };
    expect(embedded.customization).toBeUndefined();
  });
});
