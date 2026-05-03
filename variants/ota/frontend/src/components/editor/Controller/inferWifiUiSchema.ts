/**
 * inferWifiUiSchema — Blockly workspace → WifiControllerSchema
 * (47.md Phase 2 commit #3, §5.7.3)
 *
 * Two entry points for two consumers:
 *
 *   inferWifiUiSchema(opts)              (pure function, easy to test)
 *     ├── opts.projectName               → deviceId / deviceLabel
 *     ├── opts.serverStart               → endpoint.port / path
 *     └── opts.registrations             → widgets via inferWidgetForChannel
 *
 *   extractWsServerData(workspace)       (Blockly API extractor)
 *     └── walks websocket_server_start + websocket_server_register blocks,
 *         returns the inputs above ready to feed to inferWifiUiSchema.
 *
 * The split lets the cpp generator in webSocketBlocks.ts use the extractor
 * (it has a Blockly Workspace) while tests stay free of Blockly setup
 * (they construct registrations directly).
 *
 * Inference rules (47.md §9.3 BLE table, applied identically to WiFi):
 *
 *   bool      + WRITE       → gatt-toggle        ("0"/"1" wire value)
 *   numeric   + WRITE       → gatt-slider        (MIN/MAX from block fields)
 *   numeric   + READ|NOTIFY → gatt-display       (number, notify-driven)
 *   string    + READ|NOTIFY → gatt-display       (text)
 *   string    + WRITE only  → gatt-display       (Phase 1 text-display fallback;
 *                                                 Phase 2 candidate for text-input widget)
 *   bool      + READ|NOTIFY → gatt-display       (rendered as "0"/"1" string)
 *   none enabled            → warning + skipped
 *   unknown DATA_TYPE       → warning + treated as 'string'
 *   duplicate channelId     → warning + first occurrence wins
 */

import type * as Blockly from 'blockly';
import {
  DEFAULT_WS_SERVER_PATH,
  DEFAULT_WS_SERVER_PORT,
  WIFI_SCHEMA_VERSION,
  type GattDataType,
  type NumericDataType,
  type WifiControllerSchema,
  type WifiDeviceSchema,
  type WifiWidgetDefinition,
} from './types';

const NUMERIC_DATA_TYPES = new Set<NumericDataType>([
  'uint8',
  'uint16',
  'int8',
  'int16',
  'float',
]);
const VALID_DATA_TYPES = new Set<string>([...NUMERIC_DATA_TYPES, 'string', 'bool']);

// ---------------------------------------------------------------------------
// Pure function entry (testable without Blockly)
// ---------------------------------------------------------------------------

export interface WsServerStartFields {
  port: number;
  path: string;
}

export interface WsServerRegistration {
  channelId: string;
  label: string;
  /** Raw value from the Blockly DATA_TYPE dropdown — validated during inference. */
  dataType: string;
  min: number;
  max: number;
  canRead: boolean;
  canWrite: boolean;
  canNotify: boolean;
}

export interface InferWifiUiSchemaOpts {
  /** Used as `deviceLabel`; falls back to `'Device 1'` when blank. */
  projectName: string;
  /** Falls back to default port=81 / path="/" when omitted. */
  serverStart?: WsServerStartFields;
  registrations: WsServerRegistration[];
}

export function inferWifiUiSchema(opts: InferWifiUiSchemaOpts): WifiControllerSchema {
  const widgets: WifiWidgetDefinition[] = [];
  const warnings: string[] = [];
  const seenChannelIds = new Set<string>();

  for (const reg of opts.registrations) {
    inferWidgetForChannel(reg, widgets, warnings, seenChannelIds);
  }

  const port = opts.serverStart?.port ?? DEFAULT_WS_SERVER_PORT;
  const path = opts.serverStart?.path ?? DEFAULT_WS_SERVER_PATH;
  const deviceLabel = (opts.projectName || '').trim() || 'Device 1';
  const deviceId = sanitizeDeviceId(opts.projectName) || 'device-1';

  const device: WifiDeviceSchema = {
    deviceId,
    deviceLabel,
    endpoint: { port, path },
    widgets,
  };

  return {
    connection: 'wifi',
    version: WIFI_SCHEMA_VERSION,
    devices: [device],
    warnings,
  };
}

function inferWidgetForChannel(
  reg: WsServerRegistration,
  widgets: WifiWidgetDefinition[],
  warnings: string[],
  seen: Set<string>,
): void {
  const channelId = (reg.channelId || '').trim();
  if (!channelId) {
    warnings.push('Channel with empty id was skipped.');
    return;
  }

  if (seen.has(channelId)) {
    warnings.push(`Channel "${channelId}" appears multiple times; first occurrence used.`);
    return;
  }
  seen.add(channelId);

  const label = (reg.label || '').trim() || channelId;

  let dataType: GattDataType;
  if (VALID_DATA_TYPES.has(reg.dataType)) {
    dataType = reg.dataType as GattDataType;
  } else {
    dataType = 'string';
    warnings.push(`Unknown data type "${reg.dataType}" on channel "${channelId}"; treating as string.`);
  }

  if (!reg.canRead && !reg.canWrite && !reg.canNotify) {
    warnings.push(`Channel "${channelId}": no read/write/notify enabled; skipped.`);
    return;
  }

  const id = channelId;

  if (dataType === 'bool' && reg.canWrite) {
    widgets.push({ type: 'gatt-toggle', id, label, channelId });
    return;
  }
  if (NUMERIC_DATA_TYPES.has(dataType as NumericDataType) && reg.canWrite) {
    widgets.push({
      type: 'gatt-slider',
      id,
      label,
      channelId,
      dataType: dataType as NumericDataType,
      min: reg.min,
      max: reg.max,
    });
    return;
  }
  if (
    (NUMERIC_DATA_TYPES.has(dataType as NumericDataType) || dataType === 'string') &&
    (reg.canRead || reg.canNotify)
  ) {
    widgets.push({
      type: 'gatt-display',
      id,
      label,
      channelId,
      dataType: dataType as NumericDataType | 'string',
      notifyEnabled: reg.canNotify,
    });
    return;
  }
  // string + write-only → display (Phase 2 text-input widget candidate).
  if (dataType === 'string' && reg.canWrite) {
    widgets.push({
      type: 'gatt-display',
      id,
      label,
      channelId,
      dataType: 'string',
      notifyEnabled: false,
    });
    return;
  }
  // bool + read/notify only → display rendered as "0"/"1" string.
  if (dataType === 'bool' && (reg.canRead || reg.canNotify)) {
    widgets.push({
      type: 'gatt-display',
      id,
      label,
      channelId,
      dataType: 'string',
      notifyEnabled: reg.canNotify,
    });
    return;
  }
  // Unreachable given the !canRead && !canWrite && !canNotify guard above,
  // but kept for clarity.
  warnings.push(`Channel "${channelId}": no widget could be inferred; skipped.`);
}

/**
 * Strip the projectName down to a stable id usable as a JSON key / DOM key.
 * Returns empty string when no usable chars remain — caller substitutes
 * a default like `'device-1'`.
 */
function sanitizeDeviceId(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Blockly extractor (used by the cpp generator in webSocketBlocks.ts)
// ---------------------------------------------------------------------------

export interface ExtractedWsServerData {
  serverStart?: WsServerStartFields;
  registrations: WsServerRegistration[];
}

/**
 * Walks the workspace once, pulling field values from every
 * websocket_server_start (first one wins, others ignored) and every
 * websocket_server_register block.
 *
 * Why an explicit walk vs. inferUiSchema's XML-parser approach:
 *   - The cpp generator already has a `Blockly.Block` instance; getting at
 *     `block.workspace.getBlocksByType(...)` is direct and avoids an XML
 *     round-trip + DOMParser instantiation per code generation.
 *   - Blockly Block API exposes typed field reads
 *     (`block.getFieldValue(name)`), so the extractor becomes a thin map.
 *   - Tests don't need to construct a Blockly workspace — they call
 *     `inferWifiUiSchema(opts)` directly with literal registration objects.
 */
export function extractWsServerData(workspace: Blockly.Workspace): ExtractedWsServerData {
  let serverStart: WsServerStartFields | undefined;
  const registrations: WsServerRegistration[] = [];

  for (const block of workspace.getBlocksByType('websocket_server_start', false)) {
    if (serverStart) continue; // first wins
    const port = parseFloatOr(block.getFieldValue('PORT'), DEFAULT_WS_SERVER_PORT);
    const path = block.getFieldValue('PATH') || DEFAULT_WS_SERVER_PATH;
    serverStart = { port, path };
  }

  for (const block of workspace.getBlocksByType('websocket_server_register', false)) {
    registrations.push({
      channelId: block.getFieldValue('CHANNEL_ID') || '',
      label: block.getFieldValue('LABEL') || '',
      dataType: block.getFieldValue('DATA_TYPE') || 'string',
      min: parseFloatOr(block.getFieldValue('MIN'), 0),
      max: parseFloatOr(block.getFieldValue('MAX'), 100),
      canRead: block.getFieldValue('READ') === 'TRUE',
      canWrite: block.getFieldValue('WRITE') === 'TRUE',
      canNotify: block.getFieldValue('NOTIFY') === 'TRUE',
    });
  }

  return { serverStart, registrations };
}

function parseFloatOr(value: string | null | undefined, fallback: number): number {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
