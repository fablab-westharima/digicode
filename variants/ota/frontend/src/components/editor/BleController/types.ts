/**
 * WebBLE Controller UI — schema types (47.md commit #1, Phase 1)
 *
 * Intermediate representation that decouples block-XML parsing from widget
 * rendering. Reused across all 3 distribution forms:
 *  - Phase 1: editor-internal Dialog
 *  - Phase 2: shared URL page (/control/<projectId>)
 *  - Phase 3: standalone single-file HTML
 *
 * Wire format: ASCII string for all GATT characteristics (matches existing
 * firmware code that reads bleMessage = String(c->getValue().c_str())).
 * Numeric widgets format/parse the value as a base-10 ASCII number; toggle
 * uses "0"/"1". Binary encoding is a Phase 3+ optimization.
 */

export const SCHEMA_VERSION = '1.0' as const;

/** Numeric data types supported by GATT slider / display widgets. */
export type NumericDataType = 'uint8' | 'uint16' | 'int8' | 'int16' | 'float';

/** All data types declarable on a GATT characteristic. */
export type GattDataType = NumericDataType | 'string' | 'bool';

export interface NusUartWidget {
  type: 'nus-uart';
  /** Stable id for React keys / Phase 2 customization tracking. */
  id: string;
  label: string;
}

export interface GattToggleWidget {
  type: 'gatt-toggle';
  id: string;
  label: string;
  characteristicUuid: string;
}

export interface GattSliderWidget {
  type: 'gatt-slider';
  id: string;
  label: string;
  characteristicUuid: string;
  dataType: NumericDataType;
  min: number;
  max: number;
}

export interface GattDisplayWidget {
  type: 'gatt-display';
  id: string;
  label: string;
  characteristicUuid: string;
  /** What the display interprets the bytes as. */
  dataType: NumericDataType | 'string';
  /** True when the characteristic supports notify (subscribe path); false → polling. */
  notifyEnabled: boolean;
}

export type WidgetDefinition =
  | NusUartWidget
  | GattToggleWidget
  | GattSliderWidget
  | GattDisplayWidget;

export interface BleControllerSchema {
  version: typeof SCHEMA_VERSION;
  /** Phase 2 will populate these from D1; Phase 1 leaves them undefined. */
  projectId?: string;
  projectName?: string;
  device: {
    /** Empty string when no ble_uart_setup / ble_init block is present. */
    advertisedName: string;
    /** First custom GATT service UUID, if any. NUS uses fixed UUID handled by widget. */
    serviceUuid?: string;
  };
  widgets: WidgetDefinition[];
  /**
   * Non-fatal issues surfaced during inference (unknown DATA_TYPE, duplicate
   * characteristic UUID, no R/W/N enabled, etc.). UI shows these as a banner
   * inside the controller panel so the user can fix their blocks.
   */
  warnings: string[];
}

export const EMPTY_SCHEMA: BleControllerSchema = Object.freeze({
  version: SCHEMA_VERSION,
  device: { advertisedName: '' },
  widgets: [],
  warnings: [],
});
