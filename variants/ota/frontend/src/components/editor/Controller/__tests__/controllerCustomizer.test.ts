/**
 * controllerCustomizer tests (50.md §6.4 / §11 D5).
 *
 * 7 cases covering applyCustomizationDiff diff merge semantics:
 *   1. schemaLevel-only diff → schema.customization populated
 *   2. widget-level diff → matched widget gets customization
 *   3. unknown widget id → unknownIds reported, no application
 *   4. partial colorScheme → shallow-merged with existing
 *   5. mixed schemaLevel + widgets diff → both applied
 *   6. id field stripped from merged widget customization
 *   7. multi-device schema → diff matches widget across devices by id
 */
import { describe, it, expect } from 'vitest';
import { applyCustomizationDiff, type CustomizationDiff } from '../controllerCustomizer';
import type { WifiControllerSchema } from '../types';

function makeSchema(overrides: Partial<WifiControllerSchema> = {}): WifiControllerSchema {
  return {
    connection: 'wifi',
    version: '1.0',
    devices: [
      {
        deviceId: 'd1',
        deviceLabel: 'Device 1',
        endpoint: { port: 81, path: '/' },
        widgets: [
          { id: 'led', label: 'LED', channelId: 'led', type: 'gatt-toggle' },
          { id: 'temp', label: 'Temperature', channelId: 'temp', type: 'gatt-display', dataType: 'uint8', notifyEnabled: true },
        ],
      },
    ],
    warnings: [],
    ...overrides,
  };
}

describe('applyCustomizationDiff', () => {
  it('case 1: schemaLevel-only diff populates schema.customization', () => {
    const schema = makeSchema();
    const diff: CustomizationDiff = {
      schemaLevel: { layout: 'columns-2', colorScheme: { accent: '#2563eb' } },
    };
    const { schema: next, unknownIds } = applyCustomizationDiff(schema, diff);
    expect(unknownIds).toEqual([]);
    expect(next.customization?.layout).toBe('columns-2');
    expect(next.customization?.colorScheme?.accent).toBe('#2563eb');
    // widgets should be untouched (reference equality preserved when not in diff.widgets)
    expect(next.devices[0].widgets[0]).toBe(schema.devices[0].widgets[0]);
  });

  it('case 2: widget-level diff applies customization to matched widget', () => {
    const schema = makeSchema();
    const diff: CustomizationDiff = {
      widgets: [{ id: 'temp', displayMode: 'gauge' }],
    };
    const { schema: next, unknownIds } = applyCustomizationDiff(schema, diff);
    expect(unknownIds).toEqual([]);
    const tempWidget = next.devices[0].widgets[1];
    expect(tempWidget.displayMode).toBe('gauge');
    // Required fields preserved
    expect(tempWidget.id).toBe('temp');
    expect(tempWidget.label).toBe('Temperature');
    expect(tempWidget.type).toBe('gatt-display');
  });

  it('case 3: unknown widget id reported in unknownIds, no schema mutation', () => {
    const schema = makeSchema();
    const diff: CustomizationDiff = {
      widgets: [
        { id: 'nonexistent', displayMode: 'led' },
        { id: 'led', displayMode: 'led' },
      ],
    };
    const { schema: next, unknownIds } = applyCustomizationDiff(schema, diff);
    expect(unknownIds).toEqual(['nonexistent']);
    // The known one was applied
    expect(next.devices[0].widgets[0].displayMode).toBe('led');
  });

  it('case 4: partial colorScheme is shallow-merged with existing colorScheme', () => {
    // Pre-populate widget with a colorScheme.bg (simulating prior AI customization)
    const schema = makeSchema();
    schema.devices[0].widgets[0] = {
      ...schema.devices[0].widgets[0],
      colorScheme: { bg: '#ffffff', fg: '#000000' },
    };
    const diff: CustomizationDiff = {
      widgets: [{ id: 'led', colorScheme: { accent: '#ff0000' } }],
    };
    const { schema: next } = applyCustomizationDiff(schema, diff);
    const merged = next.devices[0].widgets[0].colorScheme;
    expect(merged?.bg).toBe('#ffffff');     // preserved
    expect(merged?.fg).toBe('#000000');     // preserved
    expect(merged?.accent).toBe('#ff0000'); // added
  });

  it('case 5: mixed schemaLevel + widgets diff applies both', () => {
    const schema = makeSchema();
    const diff: CustomizationDiff = {
      schemaLevel: { layout: 'rows' },
      widgets: [{ id: 'led', displayMode: 'led' }],
    };
    const { schema: next, unknownIds } = applyCustomizationDiff(schema, diff);
    expect(unknownIds).toEqual([]);
    expect(next.customization?.layout).toBe('rows');
    expect(next.devices[0].widgets[0].displayMode).toBe('led');
  });

  it('case 6: id field is preserved (not overwritten or duplicated) after diff merge', () => {
    const schema = makeSchema();
    const diff: CustomizationDiff = {
      widgets: [{ id: 'led', displayMode: 'led' }],
    };
    const { schema: next } = applyCustomizationDiff(schema, diff);
    const merged = next.devices[0].widgets[0];
    // The diff's id is used for lookup and stripped from the customization
    // spread. So the widget's id must be the original 'led' (not lost or
    // doubled), and displayMode (the only customization in the diff) is
    // applied.
    expect(merged.id).toBe('led');
    expect(merged.displayMode).toBe('led');
    // Other REQUIRED fields preserved
    expect(merged.label).toBe('LED');
    expect(merged.channelId).toBe('led');
    expect(merged.type).toBe('gatt-toggle');
  });

  it('case 7: multi-device schema matches widget by id across devices', () => {
    const schema = makeSchema({
      devices: [
        {
          deviceId: 'd1',
          deviceLabel: 'Device 1',
          endpoint: { port: 81, path: '/' },
          widgets: [{ id: 'led1', label: 'LED 1', channelId: 'led1', type: 'gatt-toggle' }],
        },
        {
          deviceId: 'd2',
          deviceLabel: 'Device 2',
          endpoint: { port: 81, path: '/', host: '192.168.1.43' },
          widgets: [{ id: 'led2', label: 'LED 2', channelId: 'led2', type: 'gatt-toggle' }],
        },
      ],
    });
    const diff: CustomizationDiff = {
      widgets: [
        { id: 'led1', colorScheme: { accent: '#ff0000' } },
        { id: 'led2', colorScheme: { accent: '#00ff00' } },
      ],
    };
    const { schema: next, unknownIds } = applyCustomizationDiff(schema, diff);
    expect(unknownIds).toEqual([]);
    expect(next.devices[0].widgets[0].colorScheme?.accent).toBe('#ff0000');
    expect(next.devices[1].widgets[0].colorScheme?.accent).toBe('#00ff00');
  });
});
