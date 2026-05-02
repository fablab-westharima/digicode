/**
 * WebBLE Controller UI — Blockly workspace XML → BleControllerSchema parser
 * (47.md commit #1, Phase 1)
 *
 * Pure function. Walks every `<block>` element regardless of nesting depth
 * (statement / value / next children all count) and infers a controller
 * schema per the rules in 47.md §8.3.
 *
 * Inference table (DATA_TYPE × R/W/N → widget):
 *   bool     + write          → gatt-toggle
 *   numeric  + write          → gatt-slider (min/max from block fields)
 *   numeric  + read|notify    → gatt-display (number)
 *   string   + read|notify    → gatt-display (text)
 *   string   + write only     → gatt-display (text; Phase 1 does not yet have
 *                               a dedicated text-input widget — string-write
 *                               characteristics get displayed for now,
 *                               Phase 2 candidate for upgrade)
 *   bool     + read|notify    → gatt-display (rendered as "0"/"1" string)
 *   none enabled              → warning + skipped
 */

import { SCHEMA_VERSION } from './types';
import type {
  BleControllerSchema,
  GattDataType,
  NumericDataType,
  WidgetDefinition,
} from './types';

const NUMERIC_DATA_TYPES = new Set<string>(['uint8', 'uint16', 'int8', 'int16', 'float']);
const VALID_DATA_TYPES = new Set<string>([...NUMERIC_DATA_TYPES, 'string', 'bool']);

const NUS_WIDGET_ID = 'nus-uart';

export function inferUiSchema(workspaceXml: string): BleControllerSchema {
  const warnings: string[] = [];
  const widgets: WidgetDefinition[] = [];
  let advertisedName = '';
  let serviceUuid: string | undefined;
  const seenCharacteristicIds = new Set<string>();

  if (!workspaceXml || !workspaceXml.trim()) {
    return makeSchema(advertisedName, serviceUuid, widgets, warnings);
  }

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(workspaceXml, 'text/xml');
  } catch {
    warnings.push('XML parse failed');
    return makeSchema(advertisedName, serviceUuid, widgets, warnings);
  }

  if (doc.querySelector('parsererror')) {
    warnings.push('XML parse failed');
    return makeSchema(advertisedName, serviceUuid, widgets, warnings);
  }

  const blocks = Array.from(doc.querySelectorAll('block'));

  for (const block of blocks) {
    const type = block.getAttribute('type');
    if (!type || !type.startsWith('ble_')) continue;

    if (type === 'ble_uart_setup') {
      const name = getFieldValue(block, 'NAME') || 'DigiCode';
      if (!advertisedName) advertisedName = name;
      if (!widgets.some((w) => w.type === 'nus-uart')) {
        widgets.push({
          type: 'nus-uart',
          id: NUS_WIDGET_ID,
          label: 'UART',
        });
      }
    } else if (type === 'ble_init') {
      const name = getFieldValue(block, 'NAME') || 'DigiCode';
      if (!advertisedName) advertisedName = name;
    } else if (type === 'ble_add_service') {
      const uuid = getFieldValue(block, 'UUID');
      if (uuid && !serviceUuid) serviceUuid = uuid;
    } else if (type === 'ble_add_characteristic') {
      processCharacteristic(block, widgets, warnings, seenCharacteristicIds);
    }
  }

  return makeSchema(advertisedName, serviceUuid, widgets, warnings);
}

function processCharacteristic(
  block: Element,
  widgets: WidgetDefinition[],
  warnings: string[],
  seen: Set<string>
): void {
  const charUuid = getFieldValue(block, 'CHAR_UUID');
  if (!charUuid) return;

  if (seen.has(charUuid)) {
    warnings.push(`Characteristic ${shortUuid(charUuid)} appears multiple times; first occurrence used.`);
    return;
  }
  seen.add(charUuid);

  const label = getFieldValue(block, 'LABEL') || `Char ${shortUuid(charUuid)}`;
  const dataTypeRaw = getFieldValue(block, 'DATA_TYPE') || 'string';
  let dataType: GattDataType;
  if (VALID_DATA_TYPES.has(dataTypeRaw)) {
    dataType = dataTypeRaw as GattDataType;
  } else {
    dataType = 'string';
    warnings.push(`Unknown data type "${dataTypeRaw}" on ${label}; treating as string.`);
  }

  const min = parseFloatOr(getFieldValue(block, 'MIN'), 0);
  const max = parseFloatOr(getFieldValue(block, 'MAX'), 100);
  const canRead = getFieldValue(block, 'READ') === 'TRUE';
  const canWrite = getFieldValue(block, 'WRITE') === 'TRUE';
  const canNotify = getFieldValue(block, 'NOTIFY') === 'TRUE';

  if (!canRead && !canWrite && !canNotify) {
    warnings.push(`Characteristic ${label}: no read/write/notify enabled; skipped.`);
    return;
  }

  const id = `gatt-${charUuid}`;

  if (dataType === 'bool' && canWrite) {
    widgets.push({ type: 'gatt-toggle', id, label, characteristicUuid: charUuid });
    return;
  }
  if (NUMERIC_DATA_TYPES.has(dataType) && canWrite) {
    widgets.push({
      type: 'gatt-slider',
      id,
      label,
      characteristicUuid: charUuid,
      dataType: dataType as NumericDataType,
      min,
      max,
    });
    return;
  }
  if ((NUMERIC_DATA_TYPES.has(dataType) || dataType === 'string') && (canRead || canNotify)) {
    widgets.push({
      type: 'gatt-display',
      id,
      label,
      characteristicUuid: charUuid,
      dataType: dataType as NumericDataType | 'string',
      notifyEnabled: canNotify,
    });
    return;
  }
  // string + write-only → display (Phase 1 reuse; Phase 2 candidate for text-input widget)
  if (dataType === 'string' && canWrite) {
    widgets.push({
      type: 'gatt-display',
      id,
      label,
      characteristicUuid: charUuid,
      dataType: 'string',
      notifyEnabled: false,
    });
    return;
  }
  // bool + read/notify only → display as 0/1 string
  if (dataType === 'bool' && (canRead || canNotify)) {
    widgets.push({
      type: 'gatt-display',
      id,
      label,
      characteristicUuid: charUuid,
      dataType: 'string',
      notifyEnabled: canNotify,
    });
    return;
  }
  // Should be unreachable given the !canRead && !canWrite && !canNotify guard above.
  warnings.push(`Characteristic ${label}: no widget could be inferred; skipped.`);
}

/**
 * Read a Blockly field value scoped to the immediate `<block>` element
 * (querySelector would descend into nested statement/value blocks, which we
 * never want here — each block's fields are direct children).
 */
function getFieldValue(blockEl: Element, fieldName: string): string {
  for (const child of Array.from(blockEl.children)) {
    if (child.tagName.toLowerCase() === 'field' && child.getAttribute('name') === fieldName) {
      return child.textContent ?? '';
    }
  }
  return '';
}

function parseFloatOr(value: string, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function shortUuid(uuid: string): string {
  return uuid.length > 8 ? uuid.substring(0, 8) : uuid;
}

function makeSchema(
  advertisedName: string,
  serviceUuid: string | undefined,
  widgets: WidgetDefinition[],
  warnings: string[]
): BleControllerSchema {
  return {
    version: SCHEMA_VERSION,
    device: serviceUuid ? { advertisedName, serviceUuid } : { advertisedName },
    widgets,
    warnings,
  };
}
