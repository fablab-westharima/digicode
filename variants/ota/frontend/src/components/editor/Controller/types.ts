/**
 * Controller — shared schema types (47.md Phase 2 commit #3, §5.7.1 / §7.4)
 *
 * This module is the type contract for the WiFi/WebSocket controller pipeline:
 *
 *   Blockly workspace
 *      └── inferWifiUiSchema (commit #3)        ──▶ WifiControllerSchema
 *                                                       │
 *      websocket_server_start generator                 │ JSON.stringify
 *                                                       ▼
 *      cpp `const char schema_json[] PROGMEM`           │
 *                                                       │  HTTP /schema.json
 *                                                       ▼
 *      browser bundle (commit #1) reads /schema.json    │
 *                                                       │  WS ws://...:port
 *                                                       ▼
 *      widget render (gatt-toggle / slider / display)   wire = { id, value }
 *
 * The widget value namespace is intentionally identical to BLE's: both
 * pipelines emit `gatt-toggle` / `gatt-slider` / `gatt-display`. Only the
 * connection metadata differs (BLE → characteristicUuid; WiFi → channelId).
 *
 * Numeric / data type vocabulary is re-exported from `BleController/types`
 * to keep both pipelines in lock-step (one source of truth: a `bool` is
 * always emitted as `"0"` / `"1"`, an `uint8` is always 0–255, etc.). When
 * a future commit refactors BLE to share inference helpers (47.md §5.7.2),
 * this re-export becomes the single import point.
 *
 * 2-layer architecture (47.md §7.1 / §7.4):
 *   Layer 1 (commits #3-#7) = rule-based inference.            REQUIRED fields.
 *   Layer 2 (Phase 4)        = AI-customized JSON via chat.    OPTIONAL fields.
 *
 * Optional fields below are NOT populated by inferWifiUiSchema (they stay
 * undefined). The bundle JS (commit #1) ignores unknown / undefined fields
 * → forward compatibility. Phase 4 will populate them via Claude-API edits.
 */

import type { GattDataType, NumericDataType } from '../BleController/types';

export type { GattDataType, NumericDataType };

export const WIFI_SCHEMA_VERSION = '1.0' as const;

// ---------------------------------------------------------------------------
// Optional widget customization (Phase 4 forward-compat slot, §7.4)
// ---------------------------------------------------------------------------

/**
 * Display-mode override for the bundle. The bundle's widget switch falls
 * back to `'plain'` semantics when the field is absent or unrecognized.
 * Not populated by Layer 1 inference.
 */
export type WidgetDisplayMode = 'plain' | 'gauge' | 'graph' | 'led';

/**
 * Layout hint for widget grouping (Phase 4 use). The bundle's default grid
 * (auto-fill, minmax(240px, 1fr)) is used when this field is undefined.
 */
export type WidgetLayout = 'grid' | 'columns-2' | 'columns-3' | 'rows';

/** Common optional customization slot (Phase 4 fillable). */
export interface WidgetCustomization {
  displayMode?: WidgetDisplayMode;
  layout?: WidgetLayout;
  /** CSS variable overrides, applied as inline style on the widget element. */
  colorScheme?: { bg?: string; fg?: string; accent?: string };
  /** Free-form CSS string, applied as a `<style scoped>` block (Phase 4). */
  customCss?: string;
}

// ---------------------------------------------------------------------------
// WiFi widget definitions (`gatt-*` semantics shared with BLE pipeline)
// ---------------------------------------------------------------------------

interface WifiWidgetBase extends WidgetCustomization {
  /** Stable id used as React key + as the wire `{ id, value }` envelope id. */
  id: string;
  /** User-facing label set on `websocket_server_register` LABEL field. */
  label: string;
  /** Same as `id`, retained for parallel-with-BLE narrow-typing of WiFi-only paths. */
  channelId: string;
}

export interface WifiToggleWidget extends WifiWidgetBase {
  type: 'gatt-toggle';
}

export interface WifiSliderWidget extends WifiWidgetBase {
  type: 'gatt-slider';
  dataType: NumericDataType;
  min: number;
  max: number;
}

export interface WifiDisplayWidget extends WifiWidgetBase {
  type: 'gatt-display';
  /** What the display interprets the bytes as. */
  dataType: NumericDataType | 'string';
  /** True when the channel was registered with NOTIFY enabled. */
  notifyEnabled: boolean;
}

export type WifiWidgetDefinition =
  | WifiToggleWidget
  | WifiSliderWidget
  | WifiDisplayWidget;

// ---------------------------------------------------------------------------
// WiFi controller schema (per-device, Phase 3 future-fit per §6.4)
// ---------------------------------------------------------------------------

/**
 * Per-device endpoint metadata. Phase 2 single-device case fills these from
 * the `websocket_server_start` block fields. Phase 3 multi-device variant
 * will fill them from per-device `host` overrides supplied by the user in
 * the unified-controller dialog.
 */
export interface WifiEndpoint {
  /** WS port (default 81 from websocket_server_start). */
  port: number;
  /** WS path (currently always `/`, reserved for Phase 3 multi-device). */
  path: string;
}

export interface WifiDeviceSchema {
  /** Stable per-device id (Phase 2 = projectName-derived; Phase 3 = unique per device in unified bundle). */
  deviceId: string;
  /** Display label shown in the controller header. */
  deviceLabel: string;
  endpoint: WifiEndpoint;
  widgets: WifiWidgetDefinition[];
}

export interface WifiControllerSchema {
  connection: 'wifi';
  version: typeof WIFI_SCHEMA_VERSION;
  /** Phase 2 length=1, Phase 3 length=N (47.md §6.4 per-device structure). */
  devices: WifiDeviceSchema[];
  /**
   * Non-fatal issues surfaced during inference (unknown DATA_TYPE, no
   * R/W/N enabled, duplicate channel id, etc.). Surfaced to the user via
   * the WifiControllerDialog (commit #4) as a banner.
   */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_WS_SERVER_PORT = 81;
export const DEFAULT_WS_SERVER_PATH = '/';

/** Empty schema — used when the workspace has no websocket_server_* blocks. */
export const EMPTY_WIFI_SCHEMA: WifiControllerSchema = Object.freeze({
  connection: 'wifi',
  version: WIFI_SCHEMA_VERSION,
  devices: [],
  warnings: [],
});
